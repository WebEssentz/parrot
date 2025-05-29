// agentXWebAgent.ts
// Agent X: Human-like, vision-guided web agent scaffold (enterprise-grade)
// Uses Puppeteer for browser automation and Gemini Vision for perception

import puppeteer, { Page } from 'puppeteer';
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
  screenshotPath: string;
  htmlPath: string;
  visionAnalysis: any;
  domAnalysis: any;
  actionTaken: string;
  resultSummary: string;
}

export interface AgentXResult {
  success: boolean;
  goal: string;
  site: string;
  steps: AgentXStepTrace[];
  finalScreenshot: string;
  finalHtml: string;
  extractedData?: any;
  error?: string;
}

// Placeholder for Gemini Vision API call
// Advanced: Use Gemini Vision API for screenshot analysis
async function analyzeScreenshotWithGemini(imagePath: string, userGoal: string): Promise<any> {
  try {
    const geminiModel = google('gemini-2.5-flash-preview-04-17');
    const imageBase64 = imageToBase64(imagePath);
    const prompt = `You are a vision-language agent. Analyze the following screenshot in the context of the user's goal: "${userGoal}". 
    1. List all visible UI elements (buttons, inputs, cards, tables, images, etc.) with their text, type, and location if possible.
    2. Extract any visible data relevant to the goal (e.g., product names, prices, video titles, etc.).
    3. If there are search bars, filters, or navigation elements, describe them.
    4. If the page is a result page (search, product list, etc.), summarize the main items.
    5. If there is any error, popup, or CAPTCHA, report it.
    6. Provide a concise summary of what the user could do next to achieve their goal.
    Respond as a JSON object with keys: elements, extractedData, summary, errors, suggestions.`;
    const { text } = await generateText({
      model: geminiModel,
      prompt: `${prompt}\n[Image (base64, PNG) attached below]\n${imageBase64}`,
    });
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

// Perceive: Take screenshot, analyze with Gemini, extract DOM

async function perceive(page: Page, stepName: string, stepIdx: number): Promise<{
  screenshotPath: `${string}.png`;
  htmlPath: `${string}.html`;
  visionAnalysis: any;
  domAnalysis: any;
}> {
  ensureAgentXWorkdir();
  const screenshotPath = path.join(AGENTX_WORKDIR, `agentx_step${stepIdx}_${stepName}.png`) as `${string}.png`;
  const htmlPath = path.join(AGENTX_WORKDIR, `agentx_step${stepIdx}_${stepName}.html`) as `${string}.html`;

  // --- FIX: Always wait for DOM content and visible body before screenshot ---
  try {
    // Wait for DOMContentLoaded and at least one visible element in body
    await page.waitForFunction(() => {
      const body = document.body;
      if (!body) return false;
      const style = window.getComputedStyle(body);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      // At least one visible child
      return Array.from(body.children).some(el => {
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
      });
    }, { timeout: 5000 });
  } catch {}

  // Remove overlays/popups that may block screenshot (common cause of blank screenshots)
  await page.evaluate(() => {
    const overlays = Array.from(document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="overlay"], [class*="backdrop"]'));
    overlays.forEach(el => { (el as HTMLElement).style.display = 'none'; });
  });

  // Take screenshot of the viewport (not clipped by main content area, to avoid blank images)
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // --- Token Counting and Truncation for HTML ---
  const html = await page.content();
  // Estimate token count (roughly 4 chars per token)
  const maxTokens = 8000; // adjust as needed for Gemini context window
  const approxTokens = Math.ceil(html.length / 4);
  let htmlToSave = html;
  let htmlTruncated = false;
  if (approxTokens > maxTokens) {
    // Truncate and add a note
    htmlToSave = html.slice(0, maxTokens * 4) + '\n<!-- [Truncated: some data omitted for performance reasons] -->';
    htmlTruncated = true;
  }
  fs.writeFileSync(htmlPath, htmlToSave);

  // --- Selective DOM Extraction: Only elements relevant to goal ---
  const domAnalysis = await page.evaluate((goal: string) => {
    function getVisibleText(el: Element | null): string {
      if (!el) return '';
      const style = window.getComputedStyle(el);
      if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) return '';
      return (el as HTMLElement).innerText || el.textContent || '';
    }
    // Heuristic: If goal mentions 'product', 'item', 'listing', focus on product cards
    const isProductGoal = /product|item|listing|buy|shop|price|cart/i.test(goal);
    // Heuristic: If goal mentions 'video', focus on video cards
    const isVideoGoal = /video|youtube|watch|channel|playlist/i.test(goal);
    // Heuristic: If goal mentions 'news', 'article', focus on articles
    const isNewsGoal = /news|article|blog|headline|story/i.test(goal);
    // Heuristic: If goal mentions 'table', focus on tables
    const isTableGoal = /table|data|spreadsheet|csv/i.test(goal);

    let productCards: any[] = [];
    let videoCards: any[] = [];
    let newsCards: any[] = [];
    let tables: any[] = [];

    if (isProductGoal) {
      productCards = Array.from(document.querySelectorAll('[class*="product"], [class*="card"], [class*="item"], [class*="listing"]')).slice(0, 8).map(d => ({
        text: getVisibleText(d),
        className: d.className,
        id: d.id
      }));
    }
    if (isVideoGoal) {
      videoCards = Array.from(document.querySelectorAll('[class*="video"], [class*="yt"], [class*="watch"], [class*="channel"]')).slice(0, 8).map(d => ({
        text: getVisibleText(d),
        className: d.className,
        id: d.id
      }));
    }
    if (isNewsGoal) {
      newsCards = Array.from(document.querySelectorAll('[class*="news"], [class*="article"], [class*="blog"], [class*="headline"], [class*="story"]')).slice(0, 8).map(d => ({
        text: getVisibleText(d),
        className: d.className,
        id: d.id
      }));
    }
    if (isTableGoal) {
      tables = Array.from(document.querySelectorAll('table')).slice(0, 2).map(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => getVisibleText(th));
        const rows = Array.from(table.querySelectorAll('tr')).slice(0, 5).map(tr =>
          Array.from(tr.querySelectorAll('td')).map(td => getVisibleText(td))
        );
        return { headers, rows };
      });
    }

    // Always extract up to 5 inputs, buttons, and headings for navigation
    const inputs = Array.from(document.querySelectorAll('input')).slice(0, 5).map(i => ({
      type: i.type,
      placeholder: i.placeholder,
      id: i.id,
      name: i.name,
      value: i.value,
      visibleText: getVisibleText(i)
    }));
    const buttons = Array.from(document.querySelectorAll('button')).slice(0, 5).map(b => ({
      text: getVisibleText(b),
      id: b.id,
      name: b.name
    }));
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 5).map(h => ({
      tag: h.tagName,
      text: getVisibleText(h)
    }));

    return { inputs, buttons, headings, productCards, videoCards, newsCards, tables };
  }, (typeof stepName === 'string' ? stepName : ''));

  // Vision analysis (summarized)
  const visionAnalysis = await analyzeScreenshotWithGemini(screenshotPath, stepName);
  let summarizedVision = visionAnalysis;
  if (visionAnalysis && typeof visionAnalysis === 'object') {
    summarizedVision = {
      summary: visionAnalysis.summary,
      errors: visionAnalysis.errors,
      suggestions: visionAnalysis.suggestions,
      elements: Array.isArray(visionAnalysis.elements) ? visionAnalysis.elements.slice(0, 5) : undefined,
      extractedData: Array.isArray(visionAnalysis.extractedData) ? visionAnalysis.extractedData.slice(0, 5) : visionAnalysis.extractedData
    };
  }

  // Add truncation info if HTML was truncated
  if (htmlTruncated) {
    if (!summarizedVision.summary) summarizedVision.summary = '';
    summarizedVision.summary += '\n[Note: HTML was truncated for performance reasons.]';
  }

  return { screenshotPath, htmlPath, visionAnalysis: summarizedVision, domAnalysis };
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
        /search/i.test(i.placeholder + i.id + i.name)
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

export async function agentXWebAgent({ instruction, url }: { instruction: AgentXInstruction; url: string }): Promise<AgentXResult> {
  ensureAgentXWorkdir();
  // Use headful mode for debugging screenshots
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  // Set a standard viewport size
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  // Wait a bit longer to ensure all content loads
  await new Promise(resolve => setTimeout(resolve, 2000));
  const steps: AgentXStepTrace[] = [];
  let lastAction = '';
  let error = '';
  let extractedData = undefined;
  let goalAchieved = false;
  try {
    // --- Streaming and Progressive Disclosure ---
    for (let stepIdx = 0; stepIdx < 5; stepIdx++) {
      try {
        // 1. Perceive
        const { screenshotPath, htmlPath, visionAnalysis, domAnalysis } = await perceive(page, `step${stepIdx}`, stepIdx);
        // 2. Reason
        const actionPlan = await decideNextAction({ instruction, visionAnalysis, domAnalysis, lastAction, stepIdx });
        // 3. Act
        const actionResult = await act(page, actionPlan);
        // 4. Check goal (advanced): Use Gemini to check if goal is achieved
        let goalCheck = false;
        try {
          const geminiModel = google('gemini-2.5-flash-preview-04-17');
          const checkPrompt = `Given the user's goal: "${instruction.goal}" and query: "${instruction.query}", and the following perception and action result, has the goal been achieved? Respond as JSON: { achieved: boolean, reason: string, extractedData?: any }\nPerception: ${JSON.stringify(visionAnalysis)}\nAction: ${JSON.stringify(actionPlan)}\nResult: ${actionResult}`;
          const { text } = await generateText({ model: geminiModel, prompt: checkPrompt });
          const check = JSON.parse(text);
          goalCheck = check.achieved;
          if (check.extractedData) extractedData = check.extractedData;
        } catch {}
        const resultSummary = `Step ${stepIdx}: ${actionPlan.description} | ${actionResult}`;
        steps.push({
          step: `Step ${stepIdx}`,
          screenshotPath,
          htmlPath,
          visionAnalysis,
          domAnalysis,
          actionTaken: actionPlan.action,
          resultSummary
        });
        // Progressive results: yield/return partial results if needed (user can request 'show more')
        // (In a real streaming API, you would yield here. For now, just accumulate steps.)
        lastAction = actionPlan.action;
        if (goalCheck) {
          goalAchieved = true;
          break;
        }
      } catch (e: any) {
        error = e.message || String(e);
        break;
      }
    }
    // Final perception
    const finalScreenshot = path.join(AGENTX_WORKDIR, `agentx_final.png`) as `${string}.png`;
    // Wait for visible content before final screenshot
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
    await page.screenshot({ path: finalScreenshot, fullPage: false });
    const finalHtml = await page.content();
    await browser.close();
    // --- CLEANUP: Delete workdir after use ---
    cleanupAgentXWorkdir();
    return {
      success: !error,
      goal: instruction.goal,
      site: instruction.site,
      steps,
      finalScreenshot,
      finalHtml,
      extractedData,
      ...(error ? { error } : {})
    };
  } catch (e: any) {
    await browser.close();
    cleanupAgentXWorkdir();
    return {
      success: false,
      goal: instruction.goal,
      site: instruction.site,
      steps,
      finalScreenshot: '',
      finalHtml: '',
      error: e.message || String(e)
    };
  }
}
