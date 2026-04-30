import { GoogleGenAI, Type } from '@google/genai';
import type { IGenerativeAiService, GeneratedContent } from '../interfaces/IAiGenerator';
import type { INewsService } from '../interfaces/INewsService';

/**
 * List of scientific and technological fields for content diversity.
 * A random field is selected on each invocation.
 */
const FIELDS: string[] = [
  // Original
  'Quantum Computing',
  'Biotechnology',
  'Astrophysics',
  'Robotics',
  'Artificial Intelligence',
  'Nanotechnology',
  'Renewable Energy Tech',
  'Space Exploration',
  'Neurotechnology',
  'Materials Science',
  // Expanded
  'Generative AI & Large Language Models',
  'CRISPR & Gene Editing',
  'Sustainable Agriculture Tech',
  'Fusion Energy',
  '6G & Advanced Wireless',
  'Cybersecurity & Encryption',
  'Autonomous Vehicles',
  '3D Printing & Additive Manufacturing',
  'Wearable Health Tech',
  'Ocean & Climate Tech',
  'Brain-Computer Interfaces',
  'Edge Computing',
  'Synthetic Biology',
  'Dark Matter & Dark Energy Research',
  'Exoplanet Discovery',
  'Lab-grown Meat & Food Tech',
  'Biodegradable Plastics',
  'Smart Cities & IoT',
  'Augmented Reality & Metaverse',
  'Drone & Aerial Tech',
  'Nuclear Battery & Microreactors',
  'Carbon Capture & Sequestration',
  'Bionic Prosthetics',
  'DNA Data Storage',
  'Space Tourism',
  'Clean Hydrogen Tech',
  'Vertical Farming',
  'Digital Twins',
  'Blockchain & Web3',
  "SOC & CHIP Inductry",
  "Electrinic Devices",
];

/**
 * Function declaration for the Gemini function calling interface.
 * The model will invoke this when it needs real-time news data.
 */
const getLatestNewsFunctionDeclaration = {
  name: 'getLatestNews',
  description:
    'Fetches the latest real-time news articles for a given scientific or technological topic. ' +
    'Returns an array of recent news articles with titles, descriptions, sources, and URLs.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          'The search query to find news articles about. Should be a specific scientific or technological topic.',
      },
      count: {
        type: Type.NUMBER,
        description:
          'The maximum number of news articles to fetch. Defaults to 5 if not specified.',
      },
    },
    required: ['query'],
  },
};

/**
 * Implements IGenerativeAiService using the Google Gen AI SDK.
 * Uses function calling (NOT tool calling) to fetch real-time news —
 * compatible with the free Gemini API tier.
 *
 * Flow:
 * 1. Send prompt + function declaration to Gemini
 * 2. Gemini responds with a functionCall requesting news data
 * 3. We execute the news fetch locally via INewsService
 * 4. We send the functionResponse back to Gemini
 * 5. Gemini synthesizes the final content from real news data
 */
export class GeminiService implements IGenerativeAiService {
  private readonly ai: GoogleGenAI;
  private readonly newsService: INewsService;

  constructor(apiKey: string, newsService: INewsService) {
    this.ai = new GoogleGenAI({ apiKey });
    this.newsService = newsService;
  }

  async generateContent(): Promise<GeneratedContent> {
    const randomField = FIELDS[Math.floor(Math.random() * FIELDS.length)];
    //const model = 'gemini-2.5-flash';
    const model = 'gemini-3-flash-preview';
    //const model = 'gemini-2.5-flash-lite';

    console.log(`[GeminiService] Selected field: "${randomField}"`);

    const today = new Date().toISOString().split('T')[0]; // e.g. "2026-04-30"

    // ── Step 1: Initial request with function declaration ──
    const prompt = `You are a top-tier science and technology content creator and social media expert, highly respected by the Myanmar tech community. 
Today's date is ${today}.

Your persona is that of a knowledgeable, passionate, and relatable tech enthusiast. You do not sound like a textbook or a robotic translator. You write exactly like a real Myanmar content creator—using natural phrasing, conversational tone, and engaging storytelling to explain complex topics.

Your task is to research the latest breakthroughs in "${randomField}", craft an engaging, in-depth Telegram post in the Burmese language (မြန်မာဘာသာ), and generate an image prompt for the post.

=== RESEARCH PHASE ===
1. Use the getLatestNews function to fetch real-time news articles.
2. Query examples: "${randomField} breakthrough", "${randomField} latest discovery", "${randomField} new research". Combine with terms like "AI" or "space" if relevant.
3. DO NOT include year numbers (e.g., 2024, 2025) in queries. The function handles recency.
4. Call getLatestNews multiple times if needed to find a truly remarkable story. 
5. Fallback: If no news is found, use your internal knowledge to report on a very recent, highly impactful development in the field as if breaking the news today.

=== WRITING STYLE & CONTENT RULES (CRITICAL) ===
1. **Human Touch & Natural Flow:** Write entirely in natural, modern, and grammatically correct Burmese. Avoid literal, word-for-word translations from English (e.g., avoid robotic phrasing like "၎င်းသည် အရေးကြီးသည်ကို သတိပြုရန်လိုသည်"). Use a warm, engaging storytelling style.
2. **Post Structure:** - Start with a powerful Hook/Headline using emojis (make them stop scrolling).
   - Write a compelling intro introducing the "Who, What, Where, When" and why it matters to Myanmar readers.
   - Use numbered sections (၁။, ၂။, ၃။) with bold sub-headlines for the body.
   - Conclude with a thought-provoking question or optimistic takeaway to encourage comments.
3. **Technical Terms:** Always introduce English technical terms alongside their Burmese explanation in parentheses, and bold both on first use. E.g., "**Large Language Model (ဘာသာစကားမော်ဒယ်အကြီးစား)**".
4. **Relatable Analogies:** Use at least one creative analogy that a Myanmar reader can easily visualize (e.g., comparing data flow to traffic in Yangon, or processing power to familiar everyday tasks). Do not force analogies if they don't fit naturally.
5. **Formatting:** Use Telegram Markdown strictly. Use **bold** for keywords and numbers. Use bullet points for readability. 
6. **Depth:** The post must be comprehensive and detailed. Do not write a shallow summary. Dive into the science, the people behind it, and the future impact.

=== IMAGE PROMPT GENERATION ===
Generate ONE image prompt.

Requirements:
- ultra realistic, cinematic, 4k
- dramatic lighting
- futuristic, high detail
- strong subject focus
- composition suitable for thumbnail

ALSO include:
- BIG Burmese headline text inside the image
- clean, bold Burmese font style
- high contrast (white/yellow text on dark background)
- positioned center or top
- short and readable (3–6 words)
- no spelling errors

Text style inspiration:
- cinematic YouTube thumbnail
- tech news poster

Format example inside prompt:
"futuristic AI robot in glowing lab, cinematic lighting, ultra realistic, 4k, dark background, dramatic shadows, depth of field, BIG bold Burmese text 'AI ကမ္ဘာပြောင်းတော့မယ်' centered, clean modern font, high contrast, trending on artstation"

=== FINAL OUTPUT FORMAT ===
You must return ONLY a raw, valid JSON object. Do not include markdown code fences (like \\\json), explanations, or any extra text outside the JSON structure.

{
  "topic": "The specific topic chosen (in English)",
  "content": "The complete, highly engaging Telegram post in natural Burmese, formatted with Markdown",
  "image_prompt": "A highly detailed, descriptive prompt in English for Midjourney/DALL-E to generate an accompanying image (e.g., 'A photorealistic glowing microchip embedded in a vibrant futuristic city, neon lights, cinematic lighting, 8k resolution, highly detailed --ar 16:9')",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}
`;


    const tools = [{ functionDeclarations: [getLatestNewsFunctionDeclaration] }];

    // Build conversation history for the function calling loop
    const contents: Array<{ role: string; parts: any[] }> = [
      { role: 'user', parts: [{ text: prompt }] },
    ];

    let response = await this.ai.models.generateContent({
      model,
      contents,
      config: { tools },
    });

    // ── Step 2 & 3: Function calling loop ──
    // The model may request one or more function calls before giving a final text answer.
    let maxIterations = 5; // Safety guard against infinite loops
    while (response.functionCalls && response.functionCalls.length > 0 && maxIterations > 0) {
      maxIterations--;

      console.log(
        `[GeminiService] Model requested ${response.functionCalls.length} function call(s)`
      );

      // Add the model's FULL response parts to preserve thoughtSignature
      // (required by gemini-3 models for function calling to work)
      const modelParts = response.candidates?.[0]?.content?.parts ??
        response.functionCalls.map((fc) => ({ functionCall: fc }));
      contents.push({
        role: 'model',
        parts: modelParts,
      });

      // Execute each function call and collect responses
      const functionResponseParts: any[] = [];

      for (const fc of response.functionCalls) {
        if (fc.name === 'getLatestNews') {
          const query = (fc.args as { query: string; count?: number }).query;
          const count = (fc.args as { query: string; count?: number }).count || 5;

          console.log(`[GeminiService] Executing getLatestNews("${query}", ${count})`);

          try {
            const articles = await this.newsService.fetchNews(query, count);
            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: { result: articles },
                id: fc.id,
              },
            });
          } catch (error) {
            console.error(`[GeminiService] News fetch failed:`, error);
            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: {
                  error: `Failed to fetch news: ${error instanceof Error ? error.message : String(error)}`,
                },
                id: fc.id,
              },
            });
          }
        }
      }

      // Add function responses to conversation and get next model response
      contents.push({ role: 'user', parts: functionResponseParts });

      response = await this.ai.models.generateContent({
        model,
        contents,
        config: { tools },
      });
    }

    // ── Step 4: Parse the final text response ──
    let text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response after function calling loop.');
    }

    console.log(`[GeminiService] Received final text response (${text.length} chars)`);

    // Robust JSON extraction — try multiple strategies
    text = text.trim();

    // Strategy 1: Extract from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    // Strategy 2: Extract JSON object from surrounding text
    if (!text.startsWith('{')) {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        text = text.slice(jsonStart, jsonEnd + 1);
      }
    }

    let parsed: GeneratedContent;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error(`[GeminiService] JSON parse failed. Raw text (first 500 chars):`, text.slice(0, 500));
      throw new Error(
        `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }

    if (!parsed.topic || !parsed.content || !Array.isArray(parsed.hashtags)) {
      // Try to salvage — hashtags might be a string instead of array
      if (typeof parsed.hashtags === 'string') {
        parsed.hashtags = (parsed.hashtags as string).split(/\s+/).filter(Boolean);
      }
      // Re-check after salvage attempt
      if (!parsed.topic || !parsed.content || !Array.isArray(parsed.hashtags)) {
        throw new Error(
          `Malformed AI response — missing fields. topic: ${!!parsed.topic}, content: ${!!parsed.content}, hashtags: ${typeof parsed.hashtags}`
        );
      }
    }

    // Ensure image_prompt has a fallback value
    if (!parsed.image_prompt) {
      parsed.image_prompt = '';
    }

    return parsed;
  }
}
