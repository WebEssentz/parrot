import { tool } from "ai";
import { z } from "zod";
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// --- Simple Markdown Bar Chart Generator ---
function generateMarkdownBarChart(
  table: { headers: string[]; rows: Record<string, string>[] },
  column: string,
  options?: { maxBars?: number; maxWidth?: number }
): string | null {
  const maxBars = options?.maxBars ?? 10;
  const maxWidth = options?.maxWidth ?? 30;
  if (!table.headers.includes(column)) return null;
  const values = table.rows.map(row => {
    let val = row[column];
    if (!val) return null;
    val = val.replace(/[$,%]/g, '').replace(/,/g, '');
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }).filter(v => v !== null) as number[];
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => b - a).slice(0, maxBars);
  const max = Math.max(...sorted);
  if (max === 0) return null;
  let chart = `\n\n**Bar Chart for '${column}'**\n\n`;
  sorted.forEach((v, i) => {
    const bar = '█'.repeat(Math.round((v / max) * maxWidth));
    chart += `${v.toString()} | ${bar}\n`;
  });
  return chart;
}

// --- Utility: Format a value as inline code ---
export function formatInlineCode(value: string): string {
  return `\`${value.replace(/`/g, '\u0060')}\``;
}

// --- Helper Function for Basic Table Parsing ---
function parseHtmlTables(html: string): { headers: string[], rows: Record<string, string>[] }[] {
    const tables = [];
    const tableRegex = /<table[\s\S]*?>(.*?)<\/table>/gi;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(html)) !== null && tables.length < 5) {
        const tableHtml = tableMatch[1];
        let headers: string[] = [];
        const rows: string[][] = [];
        const headerRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
        const firstRowHeaderRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/i;
        const cellInHeaderRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        let headerMatch;
        let foundHeaders = false;

        while ((headerMatch = headerRegex.exec(tableHtml)) !== null) {
            headers.push(headerMatch[1].replace(/<[^>]+>/g, '').trim());
            foundHeaders = true;
        }

        if (!foundHeaders) {
            const firstRowMatch = firstRowHeaderRegex.exec(tableHtml);
            if (firstRowMatch) {
                let cellMatch;
                while ((cellMatch = cellInHeaderRegex.exec(firstRowMatch[1])) !== null) {
                    headers.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
                }
                foundHeaders = headers.length > 0;
            }
        }

        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let rowMatch;
        let rowsProcessed = 0;

        if (headers.length > 0 && !tableHtml.match(/<thead/i)){
             rowRegex.exec(tableHtml); // Prime the regex
        }

        while ((rowMatch = rowRegex.exec(tableHtml)) !== null && rowsProcessed < 50) {
            const cells: string[] = [];
            let cellMatch;
             while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
            }
             if (cells.length > 0 && (headers.length === 0 || cells.length === headers.length)) {
                rows.push(cells);
                rowsProcessed++;
            }
        }

        if (headers.length > 0 && rows.length > 0) {
             const tableData = rows.map(row => {
                const rowObj: Record<string, string> = {};
                headers.forEach((header, index) => {
                    rowObj[header || `Column ${index + 1}`] = row[index] ?? '';
                });
                return rowObj;
             });
            tables.push({ headers, rows: tableData });
        } else if (headers.length === 0 && rows.length > 0) {
             const tableData = rows.map(row => {
                const rowObj: Record<string, string> = {};
                row.forEach((cell, index) => {
                    rowObj[`Column ${index + 1}`] = cell ?? '';
                });
                return rowObj;
             });
            tables.push({ headers: rows[0] ? Object.keys(tableData[0]) : [], rows: tableData });
        }
    }
    return tables;
}

export const weatherTool = tool({
  description: "Get the weather in a location",
  parameters: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});

// --- UPDATED Intent Extraction Utility ---
async function extractUserIntent(userMessage: string): Promise<{ object: string; modality: string; qualifiers: string[]; expanded: string[] }> {
    console.log(`[extractUserIntent] Starting for: "${userMessage}"`);
    try {
        const intentModel = google('gemma-3n-e4b-it');
        const prompt = `
          Analyze the user request and extract components into a JSON object: { "object", "modality", "qualifiers", "expanded" }.
          - "modality": Infer if the goal is 'image', 'video', 'summary', 'analysis', 'render', 'specs', 'information', etc. If user asks for "specs", modality is "specs".
          - "qualifiers": Adjectives like 'funny', 'high-resolution'.
          User Request: "${userMessage}"
          JSON Output:
        `;
        const { text } = await generateText({ model: intentModel, prompt, temperature: 0.1 });
        console.log(`[extractUserIntent] Raw LLM output for "${userMessage}": ${text}`);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        const finalIntent = {
            object: parsed.object || '',
            modality: parsed.modality || '',
            qualifiers: Array.isArray(parsed.qualifiers) ? parsed.qualifiers.map((q: any) => String(q).trim()).filter(Boolean) : [],
            expanded: Array.isArray(parsed.expanded) ? parsed.expanded.map((e: any) => String(e).trim()).filter(Boolean) : [],
        };
        console.log("[extractUserIntent] Successfully parsed intent:", finalIntent);
        return finalIntent;
    } catch (error) {
        console.error(`[extractUserIntent] Error for "${userMessage}":`, error);
        return { object: userMessage, modality: '', qualifiers: [], expanded: [] };
    }
}

// --- Vision Model Helper Functions ---
async function describeImageWithVision(
    src: string,
    currentIntent: { object: string; modality: string; qualifiers: string[]; expanded: string[] },
    operationStartTime: number,
    operationTimeoutMs: number
): Promise<{ description: string; confidence: number; isRelevant: boolean; detailedAnalysis?: Record<string, any> }> {
    if (Date.now() - operationStartTime > operationTimeoutMs) {
        return { description: "Timeout before vision analysis.", confidence: 0, isRelevant: false, detailedAnalysis: { error: "Timeout" } };
    }
    console.log(`[describeImageWithVision] Analyzing image: ${src} for object: ${currentIntent.object}`);
    try {
        const visionModel = google('gemma-3-27b-it'); // Powerful model for vision
        const visionPrompt = `
          Analyze the image at the URL: ${src}
          Based on the user's intent:
          - Object of interest: "${currentIntent.object || 'any relevant content'}"
          - Qualifiers: ${currentIntent.qualifiers?.length > 0 ? currentIntent.qualifiers.join(', ') : 'none'}

          Return VALID JSON: { "description": "Concise image description (max 15 words).", "relevanceToObject": "Score (0.0-1.0) of image to 'object of interest'.", "relevanceToQualifiers": "Score (0.0-1.0) of image to 'qualifiers'.", "overallConfidence": "Overall confidence (0.0-1.0) image matches FULL intent.", "subjectiveAssessment": { "isFunny": "boolean", "otherObservations": "Brief notes on subjective qualifiers." } }
        `;
        const { text } = await generateText({ model: visionModel, prompt: visionPrompt, temperature: 0.2 });
        let parsed: any;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch (e) {
            console.error(`[describeImageWithVision] Failed to parse vision JSON for ${src}:`, e, `Raw: "${text}"`);
            return { description: "AI analysis parse error.", confidence: 0.1, isRelevant: false, detailedAnalysis: { error: 'parsing failed', raw: text } };
        }

        const overallConfidence = Number(parsed.overallConfidence) || 0;
        const isFunnyQualifierPresent = currentIntent.qualifiers?.includes('funny');
        const meetsFunnyCriteria = isFunnyQualifierPresent && parsed.subjectiveAssessment?.isFunny === true;

        let isRelevant = overallConfidence > (isFunnyQualifierPresent ? 0.50 : 0.60);
        if (isFunnyQualifierPresent && !meetsFunnyCriteria && overallConfidence > 0.45) {
            isRelevant = overallConfidence > 0.80;
        } else if (isFunnyQualifierPresent && meetsFunnyCriteria) {
            isRelevant = overallConfidence > 0.45;
        }

        return { description: parsed.description || "No description.", confidence: overallConfidence, isRelevant, detailedAnalysis: parsed };
    } catch (error) {
        console.error(`[describeImageWithVision] Error for ${src}:`, error);
        return { description: "Vision analysis error.", confidence: 0.0, isRelevant: false, detailedAnalysis: { error: String(error) } };
    }
}

async function describeVideoWithVision(
    src: string,
    currentIntent: { object: string; modality: string; qualifiers: string[]; expanded: string[] },
    operationStartTime: number,
    operationTimeoutMs: number
): Promise<{ description: string; confidence: number; isRelevant: boolean; poster?: string; detailedAnalysis?: Record<string, any> }> {
    if (Date.now() - operationStartTime > operationTimeoutMs) {
        return { description: "Timeout before vision analysis.", confidence: 0, isRelevant: false, detailedAnalysis: { error: "Timeout" } };
    }
    console.log(`[describeVideoWithVision] Analyzing video: ${src} for object: ${currentIntent.object}`);
    try {
        const visionModel = google('gemma-3-27b-it');
        const visionPrompt = `
          Analyze the video at the URL: ${src}
          Based on the user's intent:
          - Object of interest: "${currentIntent.object || 'any relevant content'}"
          - Qualifiers: ${currentIntent.qualifiers?.length > 0 ? currentIntent.qualifiers.join(', ') : 'none'}

          Return VALID JSON: { "description": "Concise video summary (max 20 words).", "relevanceToObject": "Score (0.0-1.0) of video to 'object of interest'.", "relevanceToQualifiers": "Score (0.0-1.0) of video to 'qualifiers'.", "overallConfidence": "Overall confidence (0.0-1.0) video matches FULL intent.", "subjectiveAssessment": { "isFunny": "boolean", "otherObservations": "Brief notes." }, "extractedPoster": "URL of poster image, if any, else null." }
        `;
        const { text } = await generateText({ model: visionModel, prompt: visionPrompt, temperature: 0.2 });
        let parsed: any;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch (e) {
            return { description: "AI analysis parse error.", confidence: 0.1, isRelevant: false, detailedAnalysis: { error: 'parsing failed', raw: text } };
        }
        const overallConfidence = Number(parsed.overallConfidence) || 0;
        const isFunnyQualifierPresent = currentIntent.qualifiers?.includes('funny');
        const meetsFunnyCriteria = isFunnyQualifierPresent && parsed.subjectiveAssessment?.isFunny === true;
        let isRelevant = overallConfidence > (isFunnyQualifierPresent ? 0.50 : 0.60);
        if (isFunnyQualifierPresent && !meetsFunnyCriteria && overallConfidence > 0.45) isRelevant = overallConfidence > 0.80;
        else if (isFunnyQualifierPresent && meetsFunnyCriteria) isRelevant = overallConfidence > 0.45;
        return { description: parsed.description || "No summary.", confidence: overallConfidence, isRelevant, poster: parsed.extractedPoster || undefined, detailedAnalysis: parsed };
    } catch (error) {
        return { description: "Vision analysis error.", confidence: 0.0, isRelevant: false, detailedAnalysis: { error: String(error) } };
    }
}

async function filterImagesWithVision(
    imagesFromHtml: { src: string, alt: string, width?: number, height?: number }[],
    currentIntent: any,
    operationStartTime: number,
    operationTimeoutMs: number
) {
    const results = [];
    const imagesToProcess = imagesFromHtml.slice(0, 10); // Max 10 images to vision model per page
    for (const img of imagesToProcess) {
        if (Date.now() - operationStartTime > operationTimeoutMs) break;
        const visionAnalysis = await describeImageWithVision(img.src, currentIntent, operationStartTime, operationTimeoutMs);
        if (visionAnalysis.isRelevant) {
            results.push({ ...img, ...visionAnalysis });
        }
    }
    results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    return results;
}

async function filterVideosWithVision(
    videosFromHtml: { src: string, poster?: string, alt?: string }[],
    currentIntent: any,
    operationStartTime: number,
    operationTimeoutMs: number
) {
    const results = [];
    const videosToProcess = videosFromHtml.slice(0, 5); // Max 5 videos to vision model per page
    for (const vid of videosToProcess) {
        if (Date.now() - operationStartTime > operationTimeoutMs) break;
        const visionAnalysis = await describeVideoWithVision(vid.src, currentIntent, operationStartTime, operationTimeoutMs);
        if (visionAnalysis.isRelevant) {
            results.push({ ...vid, ...visionAnalysis });
        }
    }
    results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    return results;
}

async function getLinkSubject(linkText: string, linkHref: string, userGoal: string): Promise<string> {
    try {
        const linkModel = google('gemma-3n-e4b-it');
        const prompt = `User's goal: "${userGoal}". Link text: "${linkText}" (href: "${linkHref}"). Primary subject of THIS LINK? (Single noun/short phrase).`;
        const { text } = await generateText({ model: linkModel, prompt, temperature: 0.1, maxTokens: 15 });
        return text.trim().toLowerCase();
    } catch (e) {
        console.warn(`[getLinkSubject] LLM call failed for link: ${linkText}`);
        return "unknown";
    }
}

async function extractAndScoreLinks(
    htmlContent: string, 
    currentUrl: string, 
    currentIntent: any, 
    visitedSet: Set<string>,
    operationStartTime: number,
    operationTimeoutMs: number
): Promise<{ href: string, text: string, score: number }[]> {
    const aTagRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>(.*?)<\/a>/gi;
    const potentialLinks: { href: string; text: string }[] = [];
    let match;
    const currentOrigin = new URL(currentUrl).origin;

    while ((match = aTagRegex.exec(htmlContent)) !== null) {
        const href = match[1];
        const textContent = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || textContent.length < 3 || href.length > 300) continue;
        try {
            const absoluteHref = new URL(href, currentUrl).toString();
            if (new URL(absoluteHref).origin === currentOrigin && !visitedSet.has(absoluteHref)) {
                potentialLinks.push({ href: absoluteHref, text: textContent });
            }
        } catch { /* ignore invalid URLs */ }
    }

    const scoredLinks: { href: string; text: string; score: number }[] = [];
    // Limit semantic analysis to top N keyword-potential links to save time/cost
    const linksForSemanticAnalysis = potentialLinks
        .map(link => { // Initial keyword score
            let score = 0;
            const intentKeywords = [currentIntent.object, ...currentIntent.expanded].filter(Boolean).map(k => k.toLowerCase());
            if (intentKeywords.some(kw => link.text.toLowerCase().includes(kw) || link.href.toLowerCase().includes(kw))) score += 2;
            if (['product', 'gallery', 'video', 'image', 'media', 'feature', 'detail', 'spec'].some(kw => link.text.toLowerCase().includes(kw))) score +=1;
            return {...link, score};
        })
        .filter(link => link.score > 0)
        .sort((a,b) => b.score - a.score)
        .slice(0, 7); // Analyze top 7 keyword-relevant links semantically

    const linkAnalysisPromises = linksForSemanticAnalysis.map(async link => {
        if (Date.now() - operationStartTime > operationTimeoutMs - 5000) return; 

        const subject = await getLinkSubject(link.text, link.href, currentIntent.object);
        let semanticScore = link.score; // Start with keyword score
        const intentKeywords = [currentIntent.object, ...currentIntent.expanded].filter(Boolean).map(k => String(k).toLowerCase());
        
        if (intentKeywords.some(kw => subject.includes(kw))) {
            semanticScore += 10;
        }
        if (['about', 'contact', 'support', 'privacy', 'terms', 'blog', 'news'].some(kw => subject.includes(kw) || link.text.toLowerCase().includes(kw) )) {
            semanticScore -= 5;
        }
        if (semanticScore > 3) { // Final threshold after semantic check
            scoredLinks.push({ ...link, score: semanticScore });
        }
    });
    
    await Promise.all(linkAnalysisPromises);
    
    scoredLinks.sort((a, b) => b.score - a.score);
    console.log(`[extractAndScoreLinks] For ${currentUrl}, top semantically scored links:`, scoredLinks.slice(0, 5).map(l=> ({text:l.text, href:l.href, score: l.score})));
    return scoredLinks.slice(0, 5); // Return top 5 overall
}

function extractMainContent(html: string): string {
    // Basic extraction - can be improved with libraries like Readability.js for server-side node
    let mainText = html;
    mainText = mainText.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    mainText = mainText.replace(/<header[\s\S]*?<\/header>/gi, '');
    mainText = mainText.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    mainText = mainText.replace(/<aside[\s\S]*?<\/aside>/gi, '');
    mainText = mainText.replace(/<style[\s\S]*?<\/style>/gi, '');
    mainText = mainText.replace(/<script[\s\S]*?<\/script>/gi, '');
    mainText = mainText.replace(/<[^>]+>/g, ' '); // Strip all remaining tags
    mainText = mainText.replace(/\s+/g, ' ').trim(); // Collapse whitespace
    return mainText;
}

function narrateResults(allImgs: any[], allVids: any[], textContentExists: boolean, currentInt: any, startUrl: string, wasRecursive: boolean) {
    const objectStr = currentInt.object || "the requested content";
    const qualifierStr = currentInt.qualifiers?.length > 0 ? ` (${currentInt.qualifiers.join(', ')})` : '';
    const searchLocation = wasRecursive ? `across related pages starting from ${startUrl}` : `on ${startUrl}`;

    if (currentInt.modality === 'summary') {
        if (textContentExists) {
            // The actual summary is generated and placed in finalResult.narration later
            return `I've processed the text from ${searchLocation} and will provide a summary.`;
        } else {
            return `I couldn't retrieve enough text content from ${searchLocation} to create a summary for "${objectStr}${qualifierStr}".`;
        }
    }

    if (allImgs.length === 0 && allVids.length === 0) {
        return `I couldn't find any relevant images or videos for "${objectStr}${qualifierStr}" ${searchLocation}.`;
    }
    let msg = `Searching ${searchLocation}, I found:`;
    if (allImgs.length > 0) {
        msg += `\n- ${allImgs.length} relevant image(s) for "${objectStr}${qualifierStr}". The best match appears to be: "${allImgs[0].description || 'Image of ' + objectStr}" (Confidence: ${Math.round((allImgs[0].confidence || 0) * 100)}%).`;
    }
    if (allVids.length > 0) {
        msg += `\n- ${allVids.length} relevant video(s) for "${objectStr}${qualifierStr}". The best match seems to be: "${allVids[0].description || 'Video of ' + objectStr}" (Confidence: ${Math.round((allVids[0].confidence || 0) * 100)}%).`;
    }
    return msg.trim();
}

// --- UNIFIED FETCHURLTOOL ---
export const fetchUrlTool = tool({
  description:
    "The primary tool for all URL-based tasks. It can fetch, analyze, and recursively navigate web pages. It can also handle direct media links for display or analysis. It intelligently determines the correct action based on the URL type and user's intent.",
  parameters: z.object({
    url: z.string().describe("The URL to process."),
    userIntent: z.string().describe("The user's full goal or question regarding the URL."),
    recursionDepth: z.number().optional().describe("Levels to recurse for webpage analysis. Default is 1."),
  }),
  execute: async (params) => {
    const {
      url,
      userIntent,
      recursionDepth = 1,
    } = params;
    
    const maxPages = 5;
    const timeoutMs = 45000;

    const overallStartTime = Date.now();
    let isOperationTimedOut = () => (Date.now() - overallStartTime) > timeoutMs;

    console.log(`[fetchUrlTool] Starting. URL: ${url}, Intent: "${userIntent}", Depth: ${recursionDepth}, Timeout: ${timeoutMs}ms`);

    const initialIntent = await extractUserIntent(userIntent);
    if (!initialIntent.object && initialIntent.modality !== 'render') { // Allow render even if object isn't clear
        return { error: "Could not understand the main object of your request.", intent: initialIntent, narration: "I'm sorry, I had trouble understanding exactly what you're looking for. Could you try rephrasing?" };
    }
    
    const baseOrigin = (() => { try { return new URL(url).origin; } catch { return null; } })();
    if (!baseOrigin) {
        return { error: "Invalid base URL.", url, images: [], videos: [], steps: ["Invalid base URL"], narration: "The URL provided seems to be invalid." };
    }

    // --- INTERNAL ROUTER ---
    const isDirectImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(new URL(url).pathname);
    const isDirectVideo = /\.(mp4|webm|mov)$/i.test(new URL(url).pathname);
    const isDirectMedia = isDirectImage || isDirectVideo;
    
    const inferredModality = initialIntent.modality || 
                           (userIntent.toLowerCase().includes("analyze") || userIntent.toLowerCase().includes("what is") ? 'analysis' : 
                           (userIntent.toLowerCase().includes("show") || userIntent.toLowerCase().includes("render") ? 'render' : ''));

    if (isDirectMedia) {
      if (inferredModality === 'render' && isDirectImage) {
        console.log(`[fetchUrlTool] Direct image render: ${url}`);
        return {
          images: [{ src: url, alt: initialIntent.object || 'User-provided image', source: { url: url, title: "Direct Link" } }],
          videos: [],
          narration: "Of course, Here's the image you asked for.",
          overallStats: { pagesFetched: 0, totalTimeMs: Date.now() - overallStartTime, timedOut: false }
        };
      } else { // Default to analysis for direct media if not explicit render
        console.log(`[fetchUrlTool] Direct media analysis: ${url}`);
        let analysisResult;
        if (isDirectVideo) {
            analysisResult = await describeVideoWithVision(url, initialIntent, overallStartTime, timeoutMs);
            return {
              videos: analysisResult.isRelevant ? [{ src: url, ...analysisResult }] : [],
              images: [],
              narration: `I've analyzed the video: ${analysisResult.description}`,
              steps: [`Analyzed direct video: ${url}`],
              overallStats: { pagesFetched: 0, totalTimeMs: Date.now() - overallStartTime, timedOut: isOperationTimedOut() }
            };
        } else { // isDirectImage
            analysisResult = await describeImageWithVision(url, initialIntent, overallStartTime, timeoutMs);
             return {
              images: analysisResult.isRelevant ? [{ src: url, ...analysisResult }] : [],
              videos: [],
              narration: `I've analyzed the image: ${analysisResult.description}`,
              steps: [`Analyzed direct image: ${url}`],
              overallStats: { pagesFetched: 0, totalTimeMs: Date.now() - overallStartTime, timedOut: isOperationTimedOut() }
            };
        }
      }
    }

    // --- Web Page Analysis Path ---
    console.log(`[fetchUrlTool] Proceeding with web page analysis for: ${url}`);
    const visitedSet = new Set<string>();
    let pagesFetchedCount = 0;
    
    async function fetchAndAnalyzePage({ currentUrl, pageReferer, currentDepth, CIntent }: any): Promise<any> {
        if (isOperationTimedOut()) return { error: 'Timeout before processing page', url: currentUrl, steps: ["Timeout prior"] };
        if (pagesFetchedCount >= maxPages) return { error: 'Max pages limit', url: currentUrl, steps: ["Max pages prior"] };
        if (visitedSet.has(currentUrl)) return { error: 'Already visited', url: currentUrl, steps: ["Already visited"] };

        visitedSet.add(currentUrl);
        pagesFetchedCount++;
        const localSteps: string[] = [`Fetching L${recursionDepth - currentDepth}: ${currentUrl}`];
        
        let htmlContent = "";
        try {
            const res = await fetch(currentUrl, { headers: { 'User-Agent': 'AvurnaBot/1.0' }, signal: AbortSignal.timeout(15000) });
            if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) throw new Error('Fetch failed or not HTML');
            htmlContent = await res.text();
            localSteps.push('Processing HTML content.');
        } catch (e: any) {
            localSteps.push(`Error fetching ${currentUrl}: ${e.message}`);
            return { error: e.message, url: currentUrl, steps: localSteps, images: [], videos: [] };
        }

        const currentModality = CIntent.modality || (userIntent.toLowerCase().includes('video') ? 'video' : (userIntent.toLowerCase().includes('image') ? 'image' : 'summary'));
        let pageResults: { images: any[], videos: any[], textContent?: string } = { images: [], videos: [] };
        let isGoodEnoughFound = false;

        if (currentModality === 'image' || currentModality === 'video') {
            const imagesOnPage = extractImagesFromHtml(htmlContent, currentUrl);
            const videosOnPage = extractVideosFromHtml(htmlContent, currentUrl);
            pageResults.images = await filterImagesWithVision(imagesOnPage, CIntent, overallStartTime, timeoutMs);
            pageResults.videos = await filterVideosWithVision(videosOnPage, CIntent, overallStartTime, timeoutMs);
            if ((currentModality === 'image' && pageResults.images.length > 0 && pageResults.images[0].confidence >= 0.75) ||
                (currentModality === 'video' && pageResults.videos.length > 0 && pageResults.videos[0].confidence >= 0.75)) {
                isGoodEnoughFound = true;
            }
        } else if (currentModality === 'summary' || currentModality === 'specs' || currentModality === 'information') {
            const text = extractMainContent(htmlContent);
            if (text.length > 500) { // Arbitrary length for "enough text"
                pageResults.textContent = text;
                isGoodEnoughFound = true; // For specs/info, one page is usually enough if text is found
                localSteps.push(`Extracted ${text.length} chars of text.`);
            }
        }

        if (isOperationTimedOut()) {
            localSteps.push("Operation timed out during content analysis for this page.");
        }

        let pageRecursiveResults: any[] = [];
        if (currentDepth > 0 && !isGoodEnoughFound && !isOperationTimedOut()) {
            const navLinks = await extractAndScoreLinks(htmlContent, currentUrl, CIntent, visitedSet, overallStartTime, timeoutMs);
            if (navLinks.length > 0) {
                localSteps.push(`No high-confidence result found. Semantically exploring ${navLinks.length} link(s)...`);
                const linksToFollowCount = Math.min(navLinks.length, currentDepth > 1 ? 1 : 2); 
                for (let i = 0; i < linksToFollowCount; i++) {
                    if (isOperationTimedOut()) break;
                    const subResult = await fetchAndAnalyzePage({ currentUrl: navLinks[i].href, pageReferer: currentUrl, currentDepth: currentDepth - 1, CIntent: initialIntent });
                    if (subResult && !subResult.error) {
                        pageRecursiveResults.push(subResult);
                        const sr = subResult; // shorthand
                        if ((sr.images?.length && sr.images[0].confidence > 0.85) || (sr.videos?.length && sr.videos[0].confidence > 0.85) || (sr.textContent?.length > 1000)) {
                            localSteps.push(`Excellent result found via ${navLinks[i].href}. Halting exploration.`);
                            break;
                        }
                    }
                }
            }
        }
        
        const allImages = [...pageResults.images, ...pageRecursiveResults.flatMap(r => r.images || [])];
        const allVideos = [...pageResults.videos, ...pageRecursiveResults.flatMap(r => r.videos || [])];
        const allText = pageResults.textContent || pageRecursiveResults.map(r => r.textContent).find(t => t) || "";
        allImages.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        allVideos.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

        return { url: currentUrl, images: allImages, videos: allVideos, textContent: allText, steps: localSteps, recursiveResults: pageRecursiveResults };
    }

    const finalResult = await fetchAndAnalyzePage({ currentUrl: url, pageReferer: undefined, currentDepth: recursionDepth, CIntent: initialIntent });
    let finalNarration = "";

    if ((initialIntent.modality === 'summary' || initialIntent.modality === 'specs' || initialIntent.modality === 'information') && finalResult.textContent && !isOperationTimedOut()) {
        console.log(`[Summarization/Info Extraction] Processing ${finalResult.textContent.length} characters for intent: ${initialIntent.modality}`);
        const summaryModel = google('gemma-3-27b-it');
        const summaryPrompt = `User intent: "${userIntent}". Based on the following text, provide a concise answer or summary: "${finalResult.textContent.substring(0, 25000)}"`;
        try {
            const { text } = await generateText({ model: summaryModel, prompt: summaryPrompt });
            finalNarration = text;
        } catch (e) {
            finalNarration = "I found relevant text, but encountered an issue trying to process it for you.";
            console.error("[Summarization/Info] Error:", e);
        }
    } else if (isOperationTimedOut() && (initialIntent.modality === 'summary' || initialIntent.modality === 'specs' || initialIntent.modality === 'information')) {
        finalNarration = "My apologies, The operation timed out while I was gathering the full information, so I can't provide a complete answer right now.";
    } else {
        finalNarration = narrateResults(finalResult.images || [], finalResult.videos || [], !!finalResult.textContent, initialIntent, url, pagesFetchedCount > 1);
    }
    
    return {
        ...finalResult,
        narration: finalNarration,
        overallStats: { pagesFetched: pagesFetchedCount, totalTimeMs: Date.now() - overallStartTime, timedOut: isOperationTimedOut() }
    };
  },
});

// --- Google Search Tool ---
export const googleSearchTool = tool({
  description: "Search the web using Google Search Grounding for up-to-date information, current events, or general knowledge questions.",
  parameters: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
  execute: async ({ query }) => {
    try {
      const modelInstance = google('gemini-2.5-flash-preview-05-20', {
        useSearchGrounding: true,
        dynamicRetrievalConfig: { mode: 'MODE_DYNAMIC', dynamicThreshold: 0.8 },
      });
      const { text, sources, providerMetadata } = await generateText({ model: modelInstance, prompt: query });
      const metadata = providerMetadata?.google as any | undefined;
      const webSearchQueries = metadata?.groundingMetadata?.webSearchQueries ?? [];
      return { query, groundedResponse: text, sources: sources ?? [], webSearchQueries };
    } catch (error: any) {
      return { query, error: `Failed to execute Google search: ${error.message || String(error)}`, groundedResponse: null, sources: [], webSearchQueries: [] };
    }
  },
});

// --- HTML Media Extraction Utilities ---
function extractImagesFromHtml(html: string, baseUrl: string): { src: string, alt: string, width?: number, height?: number }[] {
  const images: { src: string, alt: string, width?: number, height?: number }[] = [];
  const imgTagRegex = /<img\s+([^>]*?)>/gi;
  const srcRegex = /src=["']([^"']+)["']/;
  const altRegex = /alt=["']([^"']*)["']/;
  const widthRegex = /width=["']?(\d+)/;
  const heightRegex = /height=["']?(\d+)/;

  const commonUiPatterns = /\/(logo|icon|sprite|spinner|loader|avatar|profile|badge|button|arrow|thumb|pixel|spacer)-?.*\.(\w{3,4})$/i;
  const commonUiKeywordsInAlt = ['logo', 'icon', 'button', 'arrow', 'avatar', 'profile', 'badge', 'banner ad', 'advertisement', 'placeholder'];

  let match;
  while ((match = imgTagRegex.exec(html)) !== null) {
    const imgTagContent = match[1];
    const srcMatch = srcRegex.exec(imgTagContent);
    if (!srcMatch || !srcMatch[1]) continue;
    let src = srcMatch[1];
    const altMatch = altRegex.exec(imgTagContent);
    let alt = altMatch ? altMatch[1] : '';
    try {
      src = new URL(src, baseUrl).toString();
      if (src.toLowerCase().endsWith('.svg') || src.startsWith('data:image/svg+xml')) continue; // Skip SVGs

      const widthMatch = widthRegex.exec(imgTagContent);
      const heightMatch = heightRegex.exec(imgTagContent);
      const width = widthMatch ? parseInt(widthMatch[1], 10) : undefined;
      const height = heightMatch ? parseInt(heightMatch[1], 10) : undefined;
      
      if (commonUiPatterns.test(src) || commonUiKeywordsInAlt.some(kw => alt.toLowerCase().includes(kw))) continue;
      if ((width !== undefined && width < 60) && (height !== undefined && height < 60)) continue; // Increased threshold slightly
      
      images.push({ src, alt, width, height });
    } catch { /* Invalid URL */ }
  }
  return images;
}

function extractVideosFromHtml(html: string, baseUrl: string): { src: string, poster?: string, alt?: string }[] {
  const videos: { src: string, poster?: string, alt?: string }[] = [];
  const videoTagRegex = /<video[^>]*?(?:poster=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/video>/gi;
  const sourceTagRegex = /<source[^>]+src=["']([^"']+)["'][^>]*?(?:type=["']video\/([^"']+)["'])?/gi;
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*><\/iframe>/gi;
  let match;
  while ((match = videoTagRegex.exec(html)) !== null) {
    const poster = match[1];
    const videoInnerHtml = match[2];
    let sourceMatch;
    let videoSrc: string | null = null;
    while((sourceMatch = sourceTagRegex.exec(videoInnerHtml)) !== null) {
        if (sourceMatch[1] && (!videoSrc || (sourceMatch[2] && sourceMatch[2].includes('mp4')))) {
            videoSrc = sourceMatch[1];
            if (sourceMatch[2] && sourceMatch[2].includes('mp4')) break;
        }
    }
    if (!videoSrc) {
        const videoSrcAttrMatch = /src=["']([^"']+)["']/.exec(match[0]);
        if (videoSrcAttrMatch) videoSrc = videoSrcAttrMatch[1];
    }
    if (videoSrc) {
      try {
        const absoluteSrc = new URL(videoSrc, baseUrl).toString();
        videos.push({ src: absoluteSrc, poster, alt: poster || "video content" });
      } catch { /* Invalid URL */ }
    }
  }
  while ((match = iframeRegex.exec(html)) !== null) {
    const iframeSrc = match[1];
    if (iframeSrc.includes('youtube.com/embed/') || iframeSrc.includes('player.vimeo.com/video/')) {
      try {
        const absoluteSrc = new URL(iframeSrc, baseUrl).toString();
        videos.push({ src: absoluteSrc, alt: "embedded video player" });
      } catch { /* Invalid URL */ }
    }
  }
  return videos;
}