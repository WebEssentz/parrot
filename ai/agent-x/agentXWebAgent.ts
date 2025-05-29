
// Use puppeteer-core and @sparticuz/chromium for Vercel compatibility
import puppeteerCore, { Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
let localPuppeteer: typeof puppeteerCore | undefined;
try {
  // Dynamically require puppeteer if available (for local dev)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  localPuppeteer = require('puppeteer');
} catch {}
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';


// --- AGENT X WORKDIR MANAGEMENT ---
// Use /tmp/agentx_tmp for Vercel compatibility (writable on Vercel and safe locally)
const AGENTX_WORKDIR = path.join('/tmp', 'agentx_tmp');

function ensureAgentXWorkdir() {
  if (!fs.existsSync(AGENTX_WORKDIR)) {
    fs.mkdirSync(AGENTX_WORKDIR, { recursive: true });
  }
}

function cleanupAgentXWorkdir() {
  if (fs.existsSync(AGENTX_WORKDIR)) {
    fs.rmSync(AGENTX_WORKDIR, { recursive: true, force: true });
  }
}

// Helper: Read image as base64 for Gemini Vision
function imageToBase64(imagePath: string): string {
  return fs.readFileSync(imagePath, { encoding: 'base64' });
}

export interface AgentXInstruction {
  goal: string; // e.g. "search video", "extract products"
  site: string; // e.g. "youtube.com"
  query?: string; // e.g. "MrBeast"
  [key: string]: any;
}

export interface AgentXStepTrace {
  step: string;
  screenshotBase64: string;
  html: string;
  visionAnalysis: any;
  domAnalysis: any;
  actionTaken: string;
  resultSummary: string;
  screenshotPath?: string;
  htmlPath?: string;
}
// --- REASONING LAYER: Should Use Vision? ---
// Decides if vision (screenshot/CV) is needed for the next step, or if HTML is sufficient
async function shouldUseVision({ html, domAnalysis, userGoal, stepIdx }: { html: string, domAnalysis: any, userGoal: string, stepIdx: number }): Promise<{ useVision: boolean, reason: string }> {
  try {
    const geminiModel = google('gemini-2.5-flash-preview-04-17');
    const prompt = `You are a web automation reasoning agent. Given the user's goal: "${userGoal}", the current DOM analysis, and the HTML, decide if the next step can be answered with HTML alone, or if a screenshot/vision is needed (e.g. for ambiguous, visually styled, or dynamic elements). Respond as JSON: { useVision: boolean, reason: string }.\nStep: ${stepIdx}\nDOM analysis: ${JSON.stringify(domAnalysis)}\nHTML:\n${html.slice(0, 2000)}\n[Truncated]`;
    const { text } = await generateText({ model: geminiModel, prompt });
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { useVision: false, reason: text };
    }
    return parsed;
  } catch (e: any) {
    return { useVision: false, reason: e.message || String(e) };
  }
}
// --- COMPUTER VISION ELEMENT CONFIRMATION ---
// Crop an element screenshot and analyze with Gemini Vision to confirm its type/purpose
async function analyzeElementWithVision({ page, selector, userGoal }: { page: Page, selector: string, userGoal: string }): Promise<{ visualType: string, description: string, confidence: number, raw?: any }> {
  try {
    // Get bounding box for selector
    const rect = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, selector);
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { visualType: 'unknown', description: 'Element not visible or not found', confidence: 0 };
    }
    // Take cropped screenshot
    const buffer = await page.screenshot({
      clip: {
        x: Math.max(0, rect.x),
        y: Math.max(0, rect.y),
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height)
      }
    });
    const screenshotBase64 = Buffer.from(buffer).toString('base64');
    // Vision prompt: robust, explicit
    const geminiModel = google('gemini-2.5-flash-preview-04-17');
    const prompt = `You are a computer vision expert. Given this image (base64 PNG), visually determine what UI element this is. Is it a search box, button, input, dropdown, or something else? Describe its type, purpose, and any visible text or icon. Respond as JSON: { visualType: string, description: string, confidence: number (0-1) }\nUser goal: ${userGoal}`;
    const { text } = await generateText({ model: geminiModel, prompt: prompt + `\n[Image base64]\n` + screenshotBase64 });
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { visualType: 'unknown', description: text, confidence: 0 };
    }
    return { ...parsed, raw: text };
  } catch (e: any) {
    return { visualType: 'error', description: e.message || String(e), confidence: 0 };
  }
}
// --- AGENT X STEP PLANNING FOR BATCHING ---
// Use AI to plan a batch of actions up front
async function planSteps({ html, userGoal, maxSteps = 5 }: { html: string, userGoal: string, maxSteps?: number }): Promise<Array<{ action: string; selector?: string; value?: string; description: string }>> {
  try {
    const geminiModel = google('gemini-2.5-flash-preview-04-17');
    const prompt = `You are an advanced web automation planner. Given the user's goal: "${userGoal}", and the following HTML, plan the next ${maxSteps} actions as a JSON array. Each action can be 'type', 'click', 'scroll', 'wait', or 'none'. For 'type', include selector and value. For 'click', include selector. For 'scroll', include direction or target. For 'wait', include duration. Example: [{ action: 'type', selector: '#search', value: 'query', description: 'Type query' }, ...].\nHTML:\n${html}`;
    const { text } = await generateText({ model: geminiModel, prompt });
    let parsed: any = [];
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = [];
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
 // --- AGENT X MEMORY MAPPING SYSTEM ---
// Simple in-memory cache: (site|context) -> { screenshotBase64, html, visionAnalysis, domAnalysis }
type AgentXMemoryCache = Map<string, {
  screenshotBase64: string;
  html: string;
  visionAnalysis: any;
  domAnalysis: any;
}>;
const agentXMemory: AgentXMemoryCache = new Map();

// agentXWebAgent.ts
// Agent X: Human-like, vision-guided web agent scaffold (enterprise-grade)
// Uses Puppeteer for browser automation and Gemini Vision for perception

export interface AgentXResult {
  success: boolean;
  goal: string;
  site: string;
  steps: AgentXStepTrace[];
  finalScreenshotBase64: string;
  finalHtml: string;
  finalScreenshotPath?: string;
  finalHtmlPath?: string;
  extractedData?: any;
  error?: string;
}

// Gemini Vision/Reasoning API: Accepts HTML (and optionally screenshot) for reasoning
async function analyzeWithAI({ html, userGoal, screenshotBase64 }: { html: string, userGoal: string, screenshotBase64?: string }): Promise<any> {
  try {
    const geminiModel = google('gemini-2.5-flash-preview-04-17');
    let prompt = `You are a vision-language agent. Analyze the following HTML in the context of the user's goal: "${userGoal}".\n` +
      `1. List all visible UI elements (buttons, inputs, cards, tables, images, etc.) with their text, type, and location if possible.\n` +
      `2. Extract any visible data relevant to the goal (e.g., product names, prices, video titles, etc.).\n` +
      `3. If there are search bars, filters, or navigation elements, describe them.\n` +
      `4. If the page is a result page (search, product list, etc.), summarize the main items.\n` +
      `5. If there is any error, popup, or CAPTCHA, report it.\n` +
      `6. Provide a concise summary of what the user could do next to achieve their goal.\n` +
      `If you cannot answer or the HTML is ambiguous, respond as JSON: { needsScreenshot: true, reason: string }.`;
    if (screenshotBase64) {
      prompt += `\n[Image (base64, PNG) attached below]\n${screenshotBase64}`;
    } else {
      prompt += `\n[HTML below]\n${html}`;
    }
    const { text } = await generateText({ model: geminiModel, prompt });
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: text };
    }
    return parsed;
  } catch (e: any) {
    return { error: e.message || String(e) };
  }
}

// Perceive: Take screenshot, analyze with Gemini, extract DOM (buffer + optional file save)
// Perceive with memory mapping: avoid redundant work for same site/context
// Perceive: Use HTML first, only take screenshot if AI requests it
// Perceive with reasoning: decide if vision is needed before each step
async function perceive(
  page: Page,
  stepName: string,
  stepIdx: number,
  saveFiles = false,
  memoryKey?: string,
  forceVision?: boolean
): Promise<{
  screenshotBase64: string;
  html: string;
  visionAnalysis: any;
  domAnalysis: any;
  screenshotPath?: string;
  htmlPath?: string;
  visionReason?: string;
}> {
  // Check memory cache first
  if (memoryKey && agentXMemory.has(memoryKey)) {
    const cached = agentXMemory.get(memoryKey)!;
    return { ...cached };
  }
  let screenshotPath: string | undefined;
  let htmlPath: string | undefined;
  let screenshotBase64 = '';
  let screenshotBuffer: Buffer | undefined;
  // Wait for DOMContentLoaded and at least one visible element in body
  try {
    await page.waitForFunction(() => {
      const body = document.body;
      if (!body) return false;
      const style = window.getComputedStyle(body);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      return Array.from(body.children).some(el => {
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
      });
    }, { timeout: 5000 });
  } catch {}
  // Remove overlays/popups that may block screenshot
  await page.evaluate(() => {
    const overlays = Array.from(document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="overlay"], [class*="backdrop"]'));
    overlays.forEach(el => { (el as HTMLElement).style.display = 'none'; });
  });
  // HTML
  const html = await page.content();
  const maxTokens = 8000;
  const approxTokens = Math.ceil(html.length / 4);
  let htmlToSave = html;
  let htmlTruncated = false;
  if (approxTokens > maxTokens) {
    htmlToSave = html.slice(0, maxTokens * 4) + '\n<!-- [Truncated: some data omitted for performance reasons] -->';
    htmlTruncated = true;
  }
  if (saveFiles) {
    htmlPath = path.join(AGENTX_WORKDIR, `agentx_step${stepIdx}_${stepName}.html`);
    fs.writeFileSync(htmlPath, htmlToSave);
  }
  // --- Selective DOM Extraction: Only elements relevant to goal, with bounding boxes for cross-linking ---
  const domAnalysis = await page.evaluate((goal: string) => {
    function getVisibleText(el: Element | null): string {
      if (!el) return '';
      const style = window.getComputedStyle(el);
      if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) return '';
      return (el as HTMLElement).innerText || el.textContent || '';
    }
    function getBox(el: Element | null): { x: number; y: number; width: number; height: number; center: { x: number; y: number } } | null {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        center: {
          x: r.x + r.width / 2,
          y: r.y + r.height / 2
        }
      };
    }
    // Heuristic: If goal mentions 'product', 'item', 'listing', focus on product cards
    const isProductGoal = /product|item|listing|buy|shop|price|cart/i.test(goal);
    // Heuristic: If goal mentions 'video', focus on video cards
    const isVideoGoal = /video|youtube|watch|channel|playlist/i.test(goal);
    // Heuristic: If goal mentions 'news', 'article', focus on articles
    const isNewsGoal = /news|article|blog|headline|story/i.test(goal);
    // Heuristic: If goal mentions 'table', focus on tables
    const isTableGoal = /table|data|spreadsheet|csv/i.test(goal);

    let productCards: Array<any> = [];
    let videoCards: Array<any> = [];
    let newsCards: Array<any> = [];
    let tables: Array<any> = [];


    if (isProductGoal) {
      productCards = Array.from(document.querySelectorAll('[class*="product"], [class*="card"], [class*="item"], [class*="listing"]')).slice(0, 8).map((d: Element) => {
        const box = getBox(d);
        return {
          text: getVisibleText(d),
          className: (d as HTMLElement).className,
          id: (d as HTMLElement).id,
          box,
          center: box && box.center ? box.center : null
        };
      });
    }
    if (isVideoGoal) {
      videoCards = Array.from(document.querySelectorAll('[class*="video"], [class*="yt"], [class*="watch"], [class*="channel"]')).slice(0, 8).map((d: Element) => {
        const box = getBox(d);
        return {
          text: getVisibleText(d),
          className: (d as HTMLElement).className,
          id: (d as HTMLElement).id,
          box,
          center: box && box.center ? box.center : null
        };
      });
    }
    if (isNewsGoal) {
      newsCards = Array.from(document.querySelectorAll('[class*="news"], [class*="article"], [class*="blog"], [class*="headline"], [class*="story"]')).slice(0, 8).map((d: Element) => {
        const box = getBox(d);
        return {
          text: getVisibleText(d),
          className: (d as HTMLElement).className,
          id: (d as HTMLElement).id,
          box,
          center: box && box.center ? box.center : null
        };
      });
    }
    if (isTableGoal) {
      tables = Array.from(document.querySelectorAll('table')).slice(0, 2).map((table: Element) => {
        const box = getBox(table);
        const headers = Array.from(table.querySelectorAll('th')).map((th: Element) => getVisibleText(th));
        const rows = Array.from(table.querySelectorAll('tr')).slice(0, 5).map((tr: Element) =>
          Array.from(tr.querySelectorAll('td')).map((td: Element) => getVisibleText(td))
        );
        return { headers, rows, box, center: box && box.center ? box.center : null };
      });
    }

    // Always extract up to 5 inputs, buttons, and headings for navigation, with bounding boxes and center
    const inputs = Array.from(document.querySelectorAll('input')).slice(0, 5).map((i: Element) => {
      const input = i as HTMLInputElement;
      const box = getBox(i);
      return {
        type: input.type,
        placeholder: input.placeholder,
        id: input.id,
        name: input.name,
        value: input.value,
        visibleText: getVisibleText(i),
        box,
        center: box && box.center ? box.center : null
      };
    });
    const buttons = Array.from(document.querySelectorAll('button')).slice(0, 5).map((b: Element) => {
      const btn = b as HTMLButtonElement;
      const box = getBox(b);
      return {
        text: getVisibleText(b),
        id: btn.id,
        name: btn.name,
        box,
        center: box && box.center ? box.center : null
      };
    });
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 5).map((h: Element) => {
      const box = getBox(h);
      return {
        tag: h.tagName,
        text: getVisibleText(h),
        box,
        center: box && box.center ? box.center : null
      };
    });

    // For cross-linking: collect all clickable elements (buttons, links, inputs[type=button|submit|checkbox|radio], a[href])
    const clickableElements = Array.from(document.querySelectorAll('button, a[href], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]')).slice(0, 20).map((el: Element) => {
      const htmlEl = el as HTMLElement;
      const box = getBox(el);
      return {
        tag: el.tagName,
        id: htmlEl.id,
        className: htmlEl.className,
        name: htmlEl.getAttribute('name'),
        type: htmlEl.getAttribute('type'),
        text: getVisibleText(el),
        box,
        center: box && box.center ? box.center : null,
        selector: (() => {
          if (htmlEl.id) return `#${htmlEl.id}`;
          if (htmlEl.className) return `${el.tagName.toLowerCase()}.${htmlEl.className.toString().replace(/\s+/g, '.')}`;
          return el.tagName.toLowerCase();
        })()
      };
    });

    return { inputs, buttons, headings, productCards, videoCards, newsCards, tables, clickableElements };
  }, (typeof stepName === 'string' ? stepName : ''));

  // --- Reasoning: Should we use vision for this step? ---
  let visionReason = '';
  let useVision = !!forceVision;
  if (!forceVision) {
    const visionDecision = await shouldUseVision({ html: htmlToSave, domAnalysis, userGoal: stepName, stepIdx });
    useVision = visionDecision.useVision;
    visionReason = visionDecision.reason;
  }

  // Vision/AI analysis: HTML first, or vision if needed
  let visionAnalysis: any;
  if (!useVision) {
    visionAnalysis = await analyzeWithAI({ html: htmlToSave, userGoal: stepName });
    // If AI says it needs a screenshot, escalate to vision
    if (visionAnalysis && visionAnalysis.needsScreenshot) {
      useVision = true;
      visionReason = 'AI requested screenshot for ambiguity.';
    }
  }
  if (useVision) {
    screenshotBuffer = Buffer.from(await page.screenshot({ fullPage: false }));
    screenshotBase64 = screenshotBuffer.toString('base64');
    if (saveFiles) {
      ensureAgentXWorkdir();
      screenshotPath = path.join(AGENTX_WORKDIR, `agentx_step${stepIdx}_${stepName}.png`);
      fs.writeFileSync(screenshotPath, screenshotBuffer);
    }
    visionAnalysis = await analyzeWithAI({ html: htmlToSave, userGoal: stepName, screenshotBase64 });
  }

  // --- CV fallback for ambiguous/critical elements ---
  // If visionAnalysis indicates ambiguity about a key element (e.g., search box, button), visually confirm
  if (
    visionAnalysis &&
    (visionAnalysis.summary?.toLowerCase().includes('ambiguous') ||
      (visionAnalysis.errors && JSON.stringify(visionAnalysis.errors).toLowerCase().includes('ambiguous')) ||
      (visionAnalysis.suggestions && JSON.stringify(visionAnalysis.suggestions).toLowerCase().includes('unsure')))
  ) {
    // Try to visually confirm the first input or button (as a demo; can be extended)
    let selectorToCheck = undefined;
    if (domAnalysis.inputs && domAnalysis.inputs.length > 0) {
      // Prefer input with 'search' in placeholder/id/name
      const searchInput = domAnalysis.inputs.find((i: any) => {
        const haystack = (i.placeholder || '') + (i.id || '') + (i.name || '');
        return /search/i.test(haystack);
      });
      if (searchInput && searchInput.id) {
        selectorToCheck = `#${searchInput.id}`;
      } else if (domAnalysis.inputs[0].id) {
        selectorToCheck = `#${domAnalysis.inputs[0].id}`;
      } else {
        selectorToCheck = 'input';
      }
    } else if (domAnalysis.buttons && domAnalysis.buttons.length > 0) {
      selectorToCheck = domAnalysis.buttons[0].id ? `#${domAnalysis.buttons[0].id}` : 'button';
    }
    if (selectorToCheck) {
      const cvResult = await analyzeElementWithVision({ page, selector: selectorToCheck, userGoal: stepName });
      // Attach CV result to visionAnalysis
      visionAnalysis.cvConfirmation = cvResult;
      // Optionally, update summary if CV is confident
      if (cvResult.confidence > 0.7 && cvResult.visualType !== 'unknown') {
        visionAnalysis.summary = `[CV] ${cvResult.description}`;
      }
    }
  }

  let summarizedVision = visionAnalysis;
  if (visionAnalysis && typeof visionAnalysis === 'object') {
    summarizedVision = {
      summary: visionAnalysis.summary,
      errors: visionAnalysis.errors,
      suggestions: visionAnalysis.suggestions,
      elements: Array.isArray(visionAnalysis.elements) ? visionAnalysis.elements.slice(0, 5) : undefined,
      extractedData: Array.isArray(visionAnalysis.extractedData) ? visionAnalysis.extractedData.slice(0, 5) : visionAnalysis.extractedData,
      ...(visionAnalysis.cvConfirmation ? { cvConfirmation: visionAnalysis.cvConfirmation } : {}),
      ...(visionReason ? { visionReason } : {})
    };
  }

  // Add truncation info if HTML was truncated
  if (htmlTruncated) {
    if (!summarizedVision.summary) summarizedVision.summary = '';
    summarizedVision.summary += '\n[Note: HTML was truncated for performance reasons.]';
  }

  // Store in memory cache if key provided
  if (memoryKey) {
    agentXMemory.set(memoryKey, {
      screenshotBase64,
      html: htmlToSave,
      visionAnalysis: summarizedVision,
      domAnalysis
    });
  }
  // Attach cross-linking data to visionAnalysis for screenshot mapping
  if (summarizedVision && typeof summarizedVision === 'object') {
    summarizedVision.crossLink = {
      clickableElements: domAnalysis.clickableElements,
      inputs: domAnalysis.inputs,
      buttons: domAnalysis.buttons,
      headings: domAnalysis.headings,
      productCards: domAnalysis.productCards,
      videoCards: domAnalysis.videoCards,
      newsCards: domAnalysis.newsCards,
      tables: domAnalysis.tables
    };
  }
  return { screenshotBase64, html: htmlToSave, visionAnalysis: summarizedVision, domAnalysis, screenshotPath, htmlPath };
}

// Reason: Decide next action based on perception and instruction
async function decideNextAction({
  instruction,
  visionAnalysis,
  domAnalysis,
  lastAction,
  stepIdx
}: {
  instruction: AgentXInstruction;
  visionAnalysis: any;
  domAnalysis: any;
  lastAction?: string;
  stepIdx: number;
}): Promise<{ action: string; selector?: string; value?: string; description: string }> {
  // Advanced: Use Gemini LLM for action planning (windowed context)
  // Only send the most recent step's perception data (chunked, not full history)
  const geminiModel = google('gemini-2.5-flash-preview-04-17');
  // Stepwise prompt: focus on the current logical step
  let stepInstruction = '';
  if (stepIdx === 0) {
    stepInstruction = 'First, find and use the search bar or main input if available.';
  } else if (stepIdx === 1) {
    stepInstruction = 'Now, extract the first 10 results or main items visible after the search.';
  } else {
    stepInstruction = 'Continue extracting or interacting with the next most relevant elements to achieve the user goal.';
  }
  const planPrompt = `You are an advanced web automation planner. User's goal: "${instruction.goal}". Query: "${instruction.query}".\nCurrent step: ${stepIdx}.\nInstruction: ${stepInstruction}\nPerception (vision): ${JSON.stringify(visionAnalysis)}\nPerception (DOM): ${JSON.stringify(domAnalysis)}\nLast action: ${lastAction || 'none'}\nRespond as a JSON object: { action: string, selector?: string, value?: string, description: string }. Action can be 'type', 'click', 'scroll', 'wait', or 'none'.`;
  let plan = { action: 'none', description: 'No action taken' };
  try {
    const { text } = await generateText({
      model: geminiModel,
      prompt: planPrompt,
    });
    plan = JSON.parse(text);
  } catch {
    // fallback: simple rule
    if (stepIdx === 0 && domAnalysis.inputs.length > 0) {
      const searchInput = domAnalysis.inputs.find((i: any) =>
        /search/i.test((i.placeholder || '') + (i.id || '') + (i.name || ''))
      );
      if (searchInput) {
        return {
          action: 'type',
          selector: `#${searchInput.id}`,
          value: instruction.query,
          description: 'Type query in search input'
        };
      }
    }
  }
  return plan;
}

// Act: Perform the decided action
async function act(page: Page, actionPlan: { action: string; selector?: string; value?: string; description: string }): Promise<string> {
  try {
    if (actionPlan.action === 'type' && actionPlan.selector && actionPlan.value) {
      await page.type(actionPlan.selector, actionPlan.value);
      await page.keyboard.press('Enter');
      return `Typed '${actionPlan.value}' in ${actionPlan.selector} and pressed Enter.`;
    }
    if (actionPlan.action === 'click' && actionPlan.selector) {
      await page.click(actionPlan.selector);
      return `Clicked element ${actionPlan.selector}.`;
    }
    if (actionPlan.action === 'scroll') {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      return 'Scrolled down.';
    }
    if (actionPlan.action === 'wait') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'Waited for 2 seconds.';
    }
    return 'No action performed.';
  } catch (e: any) {
    return `Error performing action: ${e.message || String(e)}`;
  }
}

// Main Agent X loop
// memoryKey: optional string to identify the site/context for caching (e.g. `${site}|${url}|${query}`)
export async function agentXWebAgent({ instruction, url, saveFiles = false, memoryKey }: { instruction: AgentXInstruction; url: string; saveFiles?: boolean; memoryKey?: string }): Promise<AgentXResult> {
  if (saveFiles) ensureAgentXWorkdir();
  // Use Vercel-compatible Chromium in production, fallback to local in dev
  const isVercel = !!process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION;
  let browser;
  if (isVercel) {
    const executablePath = await chromium.executablePath();
    browser = await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath,
      headless: chromium.headless,
    });
  } else {
    // Use local puppeteer and its Chromium
    browser = await (localPuppeteer || puppeteerCore).launch({
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
    });
  }
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 2000));
  const steps: AgentXStepTrace[] = [];
  let lastAction = '';
  let error = '';
  let extractedData = undefined;
  let goalAchieved = false;
  try {
    // --- Step 1: Perceive once, plan batch actions ---
    // Force vision for YouTube and similar homepages
    const forceVision = /youtube\.com/i.test(url) && (!instruction.query || instruction.query.trim() === '');
    const { screenshotBase64, html, visionAnalysis, domAnalysis, screenshotPath, htmlPath } = await perceive(page, `step0`, 0, saveFiles, memoryKey ? `${memoryKey}|step0` : undefined, forceVision);

    // If on YouTube homepage, enhance the vision prompt for visible videos
    if (forceVision && visionAnalysis && typeof visionAnalysis === 'object') {
      // Take another screenshot and ask Gemini for visible video cards
      const homepagePrompt = `You are a vision-language agent. Given this screenshot of the YouTube homepage, list the main visible videos/cards. For each, extract the title, channel, and any visible metadata. Respond as JSON: { videos: [{ title: string, channel?: string, metadata?: string }] }.`;
      const homepageScreenshotBuffer = Buffer.from(await page.screenshot({ fullPage: false }));
      const homepageScreenshotBase64 = homepageScreenshotBuffer.toString('base64');
      const geminiModel = google('gemini-2.5-flash-preview-04-17');
      const { text } = await generateText({ model: geminiModel, prompt: homepagePrompt + `\n[Image base64]\n` + homepageScreenshotBase64 });
      let homepageVideos: any = {};
      try {
        homepageVideos = JSON.parse(text);
      } catch { homepageVideos = { summary: text }; }
      visionAnalysis.homepageVideos = homepageVideos;
    }

    // Plan up to 5 steps in advance
    const plannedActions = await planSteps({ html, userGoal: instruction.goal, maxSteps: 5 });
    let stepIdx = 0;
    let goalAchieved = false;
    let lastPerception = { screenshotBase64, html, visionAnalysis, domAnalysis, screenshotPath, htmlPath };
    for (; stepIdx < plannedActions.length; stepIdx++) {
      const actionPlan = plannedActions[stepIdx];
      const actionResult = await act(page, actionPlan);
      // Only re-perceive if action is not 'none' or 'wait'
      if (actionPlan.action !== 'none' && actionPlan.action !== 'wait') {
        const nextPerception = await perceive(page, `step${stepIdx+1}`, stepIdx+1, saveFiles, memoryKey ? `${memoryKey}|step${stepIdx+1}` : undefined);
        lastPerception = {
          screenshotBase64: nextPerception.screenshotBase64,
          html: nextPerception.html,
          visionAnalysis: nextPerception.visionAnalysis,
          domAnalysis: nextPerception.domAnalysis,
          screenshotPath: nextPerception.screenshotPath ?? undefined,
          htmlPath: nextPerception.htmlPath ?? undefined
        };
      }
      // Check goal after each action
      let goalCheck = false;
      try {
        const geminiModel = google('gemini-2.5-flash-preview-04-17');
        const checkPrompt = `Given the user's goal: "${instruction.goal}" and query: "${instruction.query}", and the following perception and action result, has the goal been achieved? Respond as JSON: { achieved: boolean, reason: string, extractedData?: any }\nPerception: ${JSON.stringify(lastPerception.visionAnalysis)}\nAction: ${JSON.stringify(actionPlan)}\nResult: ${actionResult}`;
        const { text } = await generateText({ model: geminiModel, prompt: checkPrompt });
        const check = JSON.parse(text);
        goalCheck = check.achieved;
        if (check.extractedData) extractedData = check.extractedData;
      } catch {}
      const resultSummary = `Step ${stepIdx}: ${actionPlan.description} | ${actionResult}`;
      steps.push({
        step: `Step ${stepIdx}`,
        screenshotBase64: lastPerception.screenshotBase64,
        html: lastPerception.html,
        visionAnalysis: lastPerception.visionAnalysis,
        domAnalysis: lastPerception.domAnalysis,
        actionTaken: actionPlan.action,
        resultSummary,
        ...(saveFiles ? { screenshotPath: lastPerception.screenshotPath, htmlPath: lastPerception.htmlPath } : {})
      });
      lastAction = actionPlan.action;
      if (goalCheck) {
        goalAchieved = true;
        break;
      }
    }
    // Final perception
    let finalScreenshotBase64 = '';
    let finalScreenshotPath: string | undefined;
    let finalHtmlPath: string | undefined;
    let finalHtml = '';
    try {
      await page.waitForFunction(() => {
        const body = document.body;
        if (!body) return false;
        const style = window.getComputedStyle(body);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return Array.from(body.children).some(el => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
        });
      }, { timeout: 5000 });
    } catch {}
    const finalScreenshotBuffer = Buffer.from(await page.screenshot({ fullPage: false }));
    finalScreenshotBase64 = finalScreenshotBuffer.toString('base64');
    if (saveFiles) {
      finalScreenshotPath = path.join(AGENTX_WORKDIR, `agentx_final.png`);
      fs.writeFileSync(finalScreenshotPath, finalScreenshotBuffer);
    }
    finalHtml = await page.content();
    if (saveFiles) {
      finalHtmlPath = path.join(AGENTX_WORKDIR, `agentx_final.html`);
      fs.writeFileSync(finalHtmlPath, finalHtml);
    }
    await browser.close();
    if (saveFiles) cleanupAgentXWorkdir();
    return {
      success: !error,
      goal: instruction.goal,
      site: instruction.site,
      steps,
      finalScreenshotBase64,
      finalHtml,
      ...(saveFiles ? { finalScreenshotPath, finalHtmlPath } : {}),
      extractedData,
      ...(error ? { error } : {})
    };
  } catch (e: any) {
    await browser.close();
    if (saveFiles) cleanupAgentXWorkdir();
    return {
      success: false,
      goal: instruction.goal,
      site: instruction.site,
      steps,
      finalScreenshotBase64: '',
      finalHtml: '',
      ...(saveFiles ? { finalScreenshotPath: '', finalHtmlPath: '' } : {}),
      error: e.message || String(e)
    };
  }
}
