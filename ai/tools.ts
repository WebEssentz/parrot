import { franc } from 'franc'; // For automatic language detection
import { tool } from "ai";
import { z } from "zod";
import { google } from '@ai-sdk/google';      // For Google AI models
import { generateText } from 'ai';         // For generating text with AI models

// --- Simple Markdown Bar Chart Generator (No changes) ---
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

// --- Utility: Format a value as inline code (No changes) ---
export function formatInlineCode(value: string): string {
  return `\`${value.replace(/`/g, '\u0060')}\``;
}
// --- Helper Function for Basic Table Parsing (No changes) ---
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
             rowRegex.exec(tableHtml);
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
      Analyze the following user request and extract the specified components.
      Return the output strictly as a JSON object with the keys: "object", "modality", "qualifiers", "expanded".
      - "object": The main subject or entity of interest (e.g., 'cat', 'Eiffel Tower', 'recipe for pasta'). BE SPECIFIC.
      - "modality": The type of media or information requested (e.g., 'image', 'video', 'article', 'summary', 'data'). If not specified, try to infer or leave empty. For "summarize this article", the modality is "summary".
      - "qualifiers": Descriptive adjectives or attributes modifying the object or modality (e.g., 'funny', 'high resolution', 'blue', 'quick', 'easy'). List them as an array of strings. If none, provide an empty array [].
      - "expanded": Provide up to 3 synonyms or closely related terms for the "object" to aid in searching. List them as an array of strings. If none, provide an empty array [].

      User Request: "${userMessage}"

      JSON Output:
    `;

    const { text } = await generateText({ model: intentModel, prompt, temperature: 0.1 });
    console.log(`[extractUserIntent] Raw LLM output: ${text}`);

    let parsed: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(text);
      }
    } catch (e) {
      console.error("[extractUserIntent] Failed to parse LLM intent JSON:", e, "Raw text was:", text);
      return { object: userMessage, modality: '', qualifiers: [], expanded: [] };
    }
    const finalIntent = {
      object: parsed.object || '',
      modality: parsed.modality || '',
      qualifiers: Array.isArray(parsed.qualifiers) ? parsed.qualifiers.map((q: any) => String(q).trim()).filter(Boolean) : [],
      expanded: Array.isArray(parsed.expanded) ? parsed.expanded.map((e: any) => String(e).trim()).filter(Boolean) : [],
    };
    console.log("[extractUserIntent] Successfully parsed intent:", finalIntent);
    return finalIntent;

  } catch (error) {
    console.error("[extractUserIntent] Outer error:", error);
    return { object: userMessage, modality: '', qualifiers: [], expanded: [userMessage] };
  }
}

// --- FULLY UPDATED AND RE-ARCHITECTED FETCHURLTOOL ---
export const fetchUrlTool = tool({
  description:
    "Fetches content from a URL, and can recursively navigate to find specific information like images, videos, or text for summarization. It uses AI to understand the page content and make smart decisions.",
  parameters: z.object({
    url: z.string().describe("The starting URL to fetch and analyze."),
    userIntent: z.string().describe("The user's goal or question (e.g., 'image of an iPhone', 'summarize this article about macOS')."),
    recursionDepth: z.number().optional().describe("How many levels of links to follow (0 = current page only, default 1)."),
  }),
  execute: async (params) => {
    const {
      url,
      userIntent,
      recursionDepth = 1,
    } = params;
    
    // Sensible defaults to prevent runaways
    const maxPages = 5;
    const timeoutMs = 45000; // Increased to 45 seconds

    console.log(`[fetchUrlTool] Starting. URL: ${url}, Intent: "${userIntent}", Depth: ${recursionDepth}, Timeout: ${timeoutMs}ms`);

    const visited = new Set<string>();
    const overallStartTime = Date.now();
    let pagesFetchedCount = 0;
    let operationTimedOut = false;
    const baseOrigin = (() => { try { return new URL(url).origin; } catch { return null; } })();

    if (!baseOrigin) {
        return { error: "Invalid base URL provided.", url, images: [], videos: [], steps: ["Invalid base URL"], narration: "I couldn't process that request because the URL seems to be invalid." };
    }

    const initialIntent = await extractUserIntent(userIntent);
    if (!initialIntent.object) {
        return { error: "Could not understand the main object of your request.", intent: initialIntent, narration: "I'm sorry, I had trouble understanding exactly what you're looking for. Could you try rephrasing?" };
    }

    // --- Core Helper Functions with Semantic Intelligence ---

    async function getLinkSubject(linkText: string, linkHref: string, userGoal: string): Promise<string> {
        try {
            const linkModel = google('gemma-3n-e4b-it'); // Use the fast model
            const prompt = `A user's goal is to "${userGoal}". On a webpage, there is a link with the text "${linkText}" that points to "${linkHref}". What is the primary subject of THIS LINK? Respond with a single noun or short phrase.`;
            const { text } = await generateText({ model: linkModel, prompt, temperature: 0.1, maxTokens: 20 });
            return text.trim().toLowerCase();
        } catch (e) {
            console.warn(`[getLinkSubject] LLM call failed for link: ${linkText}`);
            return "unknown";
        }
    }

    async function extractAndScoreLinks(htmlContent: string, currentUrl: string, currentIntent: any): Promise<{ href: string, text: string, score: number }[]> {
        const aTagRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>(.*?)<\/a>/gi;
        const potentialLinks: { href: string; text: string }[] = [];
        let match;

        while ((match = aTagRegex.exec(htmlContent)) !== null) {
            const href = match[1];
            const textContent = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || textContent.length < 3 || href.length > 300) continue;
            try {
                const absoluteHref = new URL(href, currentUrl).toString();
                if (new URL(absoluteHref).origin === baseOrigin && !visited.has(absoluteHref)) {
                    potentialLinks.push({ href: absoluteHref, text: textContent });
                }
            } catch { /* ignore invalid URLs */ }
        }

        const scoredLinks: { href: string; text: string; score: number }[] = [];
        const linkAnalysisPromises = potentialLinks.slice(0, 10).map(async link => {
            if (Date.now() - overallStartTime > timeoutMs - 5000) return; // Don't start new LLM calls if we're about to time out

            const subject = await getLinkSubject(link.text, link.href, currentIntent.object);
            let score = 0;
            const intentKeywords = [currentIntent.object, ...currentIntent.expanded].filter(Boolean).map(k => k.toLowerCase());
            
            if (intentKeywords.some(kw => subject.includes(kw))) {
                score += 10; // Massive bonus if the link's SEMANTIC subject matches the intent
            } else if (intentKeywords.some(kw => link.text.toLowerCase().includes(kw) || link.href.toLowerCase().includes(kw))) {
                score += 2; // Keyword match is a fallback bonus
            }
            if (['about', 'contact', 'support', 'privacy', 'terms'].some(kw => link.text.toLowerCase().includes(kw))) {
                score -= 5;
            }
            if (score > 3) {
                scoredLinks.push({ ...link, score });
            }
        });
        
        await Promise.all(linkAnalysisPromises);
        
        scoredLinks.sort((a, b) => b.score - a.score);
        console.log(`[extractAndScoreLinks] For ${currentUrl}, top links:`, scoredLinks.slice(0, 5));
        return scoredLinks.slice(0, 5);
    }
    
    function extractMainContent(html: string): string {
        return html
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function describeImageWithVision(
      src: string,
      currentIntent: { object: string; modality: string; qualifiers: string[]; expanded: string[] }
    ): Promise<{ description: string; confidence: number; isRelevant: boolean; detailedAnalysis?: Record<string, any> }> {
      console.log(`[describeImageWithVision] Analyzing image: ${src} for object: ${currentIntent.object}`);
      try {
        const visionModel = google('gemma-3-27b-it');
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
      currentIntent: { object: string; modality: string; qualifiers: string[]; expanded: string[] }
    ): Promise<{ description: string; confidence: number; isRelevant: boolean; poster?: string; detailedAnalysis?: Record<string, any> }> {
        // This function would be very similar to describeImageWithVision, using the same gemma-3-27b-it model
        // For brevity, the logic is kept close to the image version.
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
        currentIntent: any
    ) {
      const results = [];
      const imagesToProcess = imagesFromHtml.slice(0, 10);
      for (const img of imagesToProcess) {
        if (Date.now() - overallStartTime > timeoutMs) { operationTimedOut = true; break; }
        const visionAnalysis = await describeImageWithVision(img.src, currentIntent);
        if (visionAnalysis.isRelevant) {
          results.push({ ...img, ...visionAnalysis });
        }
      }
      results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      return results;
    }

    async function filterVideosWithVision(
        videosFromHtml: { src: string, poster?: string, alt?: string }[],
        currentIntent: any
    ) {
      const results = [];
      const videosToProcess = videosFromHtml.slice(0, 5);
      for (const vid of videosToProcess) {
        if (Date.now() - overallStartTime > timeoutMs) { operationTimedOut = true; break; }
        const visionAnalysis = await describeVideoWithVision(vid.src, currentIntent);
        if (visionAnalysis.isRelevant) {
          results.push({ ...vid, ...visionAnalysis });
        }
      }
      results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      return results;
    }

    function narrateResults(allImgs: any[], allVids: any[], currentInt: any, startUrl: string, wasRecursive: boolean) {
        const objectStr = currentInt.object || "the requested content";
        const qualifierStr = currentInt.qualifiers?.length > 0 ? ` (${currentInt.qualifiers.join(', ')})` : '';
        const searchLocation = wasRecursive ? `across related pages starting from ${startUrl}` : `on ${startUrl}`;
        if (allImgs.length === 0 && allVids.length === 0) {
            return `I couldn't find any relevant images or videos for "${objectStr}${qualifierStr}" ${searchLocation}.`;
        }
        let msg = `Searching ${searchLocation}, I found ${allImgs.length} relevant image(s) and ${allVids.length} relevant video(s) for "${objectStr}${qualifierStr}".\n`;
        if (allImgs.length > 0) {
            const topImage = allImgs[0];
            msg += `The best image match: "${topImage.description || 'Image of ' + objectStr}" (Confidence: ${Math.round((topImage.confidence || 0) * 100)}%).`;
        }
        if (allVids.length > 0) {
            msg += `\nThe best video match: "${allVids[0].description || 'Video of ' + objectStr}" (Confidence: ${Math.round((allVids[0].confidence || 0) * 100)}%).`;
        }
        return msg.trim();
    }


    async function fetchAndAnalyze({ currentUrl, pageReferer, currentDepth, CIntent }: { currentUrl: string, pageReferer?: string, currentDepth: number, CIntent: any }): Promise<any> {
        console.log(`[fetchAndAnalyze] Depth ${recursionDepth - currentDepth}, URL: ${currentUrl}, Object: ${CIntent.object}`);
        if (operationTimedOut || Date.now() - overallStartTime > timeoutMs) {
            operationTimedOut = true;
            return { error: 'Operation timeout reached before processing this page.', url: currentUrl, steps: ["Timeout prior"] };
        }
        if (pagesFetchedCount >= maxPages) return { error: 'Max pages limit reached.', url: currentUrl, steps: ["Max pages hit prior"] };
        if (visited.has(currentUrl)) return { error: 'Already visited.', url: currentUrl, steps: ["Already visited"] };

        visited.add(currentUrl);
        pagesFetchedCount++;
        const localSteps: string[] = [];
        localSteps.push(`Fetching L${recursionDepth - currentDepth}: ${currentUrl}`);

        let htmlContent = "";
        try {
            const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (compatible; AvurnaBot/1.0)' };
            if (pageReferer) headers['Referer'] = pageReferer;
            const res = await fetch(currentUrl, { method: 'GET', headers, signal: AbortSignal.timeout(15000) });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) throw new Error(`Unsupported content type: ${contentType}`);
            htmlContent = await res.text();
            localSteps.push('Processing HTML content.');
        } catch (fetchError: any) {
            localSteps.push(`Error fetching ${currentUrl}: ${fetchError.message}`);
            console.error(`[fetchAndAnalyze] Fetch error for ${currentUrl}:`, fetchError);
            return { error: `Fetch error: ${fetchError.message}`, url: currentUrl, steps: localSteps };
        }

        let pageResults: { images: any[], videos: any[], textContent?: string } = { images: [], videos: [] };
        let isGoodEnoughFound = false;
        const inferredModality = CIntent.modality || (userIntent.toLowerCase().includes('video') ? 'video' : (userIntent.toLowerCase().includes('image') ? 'image' : 'summary'));
        let foundItemsOnPage = 0;

        if (inferredModality === 'image' || inferredModality === 'video') {
            const imagesOnPage = extractImagesFromHtml(htmlContent, currentUrl);
            const videosOnPage = extractVideosFromHtml(htmlContent, currentUrl);
            pageResults.images = await filterImagesWithVision(imagesOnPage, CIntent);
            pageResults.videos = await filterVideosWithVision(videosOnPage, CIntent);
            foundItemsOnPage = pageResults.images.length + pageResults.videos.length;
            if ((inferredModality === 'image' && pageResults.images.length > 0 && pageResults.images[0].confidence >= 0.75) ||
                (inferredModality === 'video' && pageResults.videos.length > 0 && pageResults.videos[0].confidence >= 0.75)) {
                isGoodEnoughFound = true;
            }
        } else if (inferredModality === 'summary') {
            const textContent = extractMainContent(htmlContent);
            if (textContent.length > 500) {
                pageResults.textContent = textContent;
                isGoodEnoughFound = true;
                foundItemsOnPage = 1;
                localSteps.push(`Extracted ${textContent.length} characters of text for summarization.`);
            } else {
                localSteps.push(`Found insufficient text on page for a good summary.`);
            }
        }
        
        if (Date.now() - overallStartTime > timeoutMs) operationTimedOut = true;

        let pageRecursiveResults: any[] = [];
        if (currentDepth > 0 && !isGoodEnoughFound && !operationTimedOut) {
            const pageNavLinks = await extractAndScoreLinks(htmlContent, currentUrl, CIntent);
            if (pageNavLinks.length > 0) {
                localSteps.push(`No high-confidence result found. Semantically exploring ${pageNavLinks.length} link(s)...`);
                const linksToFollowCount = Math.min(pageNavLinks.length, currentDepth > 1 ? 1 : 2);
                for (let i = 0; i < linksToFollowCount; i++) {
                    if (Date.now() - overallStartTime > timeoutMs) { operationTimedOut = true; break; }
                    const link = pageNavLinks[i];
                    const subResult = await fetchAndAnalyze({ currentUrl: link.href, pageReferer: currentUrl, currentDepth: currentDepth - 1, CIntent: initialIntent });
                    if (subResult && !subResult.error) {
                        pageRecursiveResults.push(subResult);
                        const subImages = subResult.images || [];
                        const subVideos = subResult.videos || [];
                        const subText = subResult.textContent || "";
                        if ((subImages.length > 0 && subImages[0].confidence > 0.85) || 
                            (subVideos.length > 0 && subVideos[0].confidence > 0.85) || 
                            (subText.length > 1000)) {
                            localSteps.push(`Excellent result found via ${link.href}. Halting further exploration from this page.`);
                            break;
                        }
                    } else if (subResult?.error) {
                        localSteps.push(`Sub-fetch for ${link.href} resulted in error: ${subResult.error}`);
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
    
    // --- Start the process ---
    const finalResult = await fetchAndAnalyze({ currentUrl: url, pageReferer: undefined, currentDepth: recursionDepth, CIntent: initialIntent });

    // --- Final Summarization Step (if needed) ---
    if (initialIntent.modality === 'summary' && finalResult.textContent && !operationTimedOut) {
        try {
            console.log(`[Summarization] Summarizing ${finalResult.textContent.length} characters.`);
            const summaryModel = google('gemma-3-27b-it'); // Use powerful model for summarization
            const summaryPrompt = `Based on the following article text, provide a concise summary highlighting the key points. Article Text: "${finalResult.textContent.substring(0, 25000)}"`; // Limit context
            const { text } = await generateText({ model: summaryModel, prompt: summaryPrompt });
            finalResult.narration = text;
        } catch (e) {
            finalResult.narration = "I found the article text, but there was an error while trying to summarize it.";
            console.error("[Summarization] Error:", e);
        }
    } else if (operationTimedOut && initialIntent.modality === 'summary') {
        finalResult.narration = "My apologies, King. The operation timed out while I was gathering the full article text, so I can't provide a complete summary right now."
    } else {
        finalResult.narration = narrateResults(finalResult.images || [], finalResult.videos || [], initialIntent, url, pagesFetchedCount > 1);
    }
    
    return {
        ...finalResult,
        overallStats: { pagesFetched: pagesFetchedCount, totalTimeMs: Date.now() - overallStartTime, timedOut: operationTimedOut }
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
  const imgTagRegex = /<img\s+([^>]*?)>/gi;
  const srcRegex = /src=["']([^"']+)["']/;
  const altRegex = /alt=["']([^"']*)["']/;
  const widthRegex = /width=["']?(\d+)/;
  const heightRegex = /height=["']?(\d+)/;

  const images: { src: string, alt: string, width?: number, height?: number }[] = [];
  const commonUiPatterns = /\/(logo|icon|sprite|spinner|loader|avatar|profile|badge|button|arrow|thumb|pixel|spacer)-?.*\.(\w{3,4})$/i;
  const commonUiKeywordsInAlt = ['logo', 'icon', 'button', 'arrow', 'avatar', 'profile', 'badge', 'banner ad', 'advertisement'];

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
      const widthMatch = widthRegex.exec(imgTagContent);
      const heightMatch = heightRegex.exec(imgTagContent);
      const width = widthMatch ? parseInt(widthMatch[1], 10) : undefined;
      const height = heightMatch ? parseInt(heightMatch[1], 10) : undefined;
      if (commonUiPatterns.test(src) || commonUiKeywordsInAlt.some(kw => alt.toLowerCase().includes(kw))) continue;
      if ((width !== undefined && width < 50) && (height !== undefined && height < 50)) continue;
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