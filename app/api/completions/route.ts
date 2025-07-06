// src/app/api/completions/route.ts

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return new Response(JSON.stringify({ error: 'Input is required' }), {
        status: 400,
      headers: { 'Content-Type': 'application/json' },
      });
    }

    const model = google('gemini-1.5-flash-latest');

    const { text } = await generateText({
      model,
      system: `You are an AI assistant that completes a user's thought.
      Given the user's partial input, provide 4 concise, relevant, and high-quality completions.
      Each completion should be a full sentence or command that logically follows the input.
      Do not add any extra text, numbering, or explanations.
      Return ONLY a valid JSON array of strings.
      
      Example Input: "Help me create"
      Example Output: ["Help me create a bar chart from this data", "Help me create a new project plan", "Help me create a scatter plot", "Help me create a presentation"]`,
      prompt: input,
      temperature: 0.1,
    });

    try {
      // --- START OF THE FIX ---
      // 1. Create a robust regular expression to find and remove the JSON fences.
      //    This handles optional "json" language specifier and any whitespace.
      const jsonRegex = /```(json)?\s*([\s\S]*?)\s*```/;
      const match = text.match(jsonRegex);

      // 2. Extract the clean JSON string. If the fences are not present,
      //    assume the whole string is the JSON.
      const cleanJsonString = match ? match[2].trim() : text.trim();
      
      // 3. Parse the cleaned string.
      const completions = JSON.parse(cleanJsonString);
      // --- END OF THE FIX ---
      
      return new Response(JSON.stringify({ completions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      // Your existing error handling is perfect for this.
      console.error('Edge Completions: Failed to parse AI response.', { text, error: e });
      return new Response(JSON.stringify({ completions: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Edge Completions Error:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}