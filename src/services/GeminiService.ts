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
    const prompt = `You are an expert science and technology journalist and social media manager dedicated to a Myanmar audience.  
Today's date is ${today}.  
Your tone should be kind, friendly, and professional — like a trusted friend explaining exciting news.

Your task is to research the very latest news and breakthroughs in the field of "${randomField}" and then craft a long, engaging Telegram post entirely in the Burmese language (မြန်မာဘာသာ).

=== RESEARCH PHASE ===
1. Use the getLatestNews function to fetch real‑time news articles.  
2. When calling getLatestNews, use short, topical queries such as:  
   "${randomField} breakthrough"  
   "${randomField} latest discovery"  
   "${randomField} new research"  
   You may also combine terms like "${randomField} AI" or "${randomField} space mission" if relevant.  
3. **Do NOT include any year numbers** (like 2024, 2025, 2026) in your search queries — the function already filters for recent articles.  
4. Call getLatestNews multiple times with different queries until you have 2‑3 interesting, current stories. Choose the most remarkable one to write about.  
5. If no truly newsworthy results appear after several attempts, you may broaden the query (e.g., "${randomField} innovation") or, as a last resort, use your own knowledge of a very recent development in the field that would interest a Myanmar audience. In that case, still write as if you have just reported it.

=== WRITING STYLE GUIDE (Study this carefully) ===
Follow this exact structure and tone. Below is an English example of the style you must replicate — your final output must be in Burmese.

**Example structure (for illustration only):**

🚀 **Headline/Hook** (bold, attention‑grabbing, one sentence that makes people stop scrolling)

Intro paragraph:  
Start with a powerful, specific fact. Mention the who, what, where, when. Include a specific number, date, or statistic. Explain why this matters to a Myanmar reader in relatable terms.

**၁။ ခေါင်းစဉ်တစ်ခု (Sub‑headline in bold)**  
Detailed explanation of the first key point. Use simple analogies. For technical terms, write the English term alongside the Burmese explanation in parentheses, e.g., "Multimodal Reasoning Model (အမျိုးမျိုးသော အာရုံခံစားမှုများကို တစ်ပြိုင်နက်နားလည်နိုင်သော မော်ဒယ်)". Make sure any technical term is bolded the first time it appears.

**၂။ နောက်ထပ်အချက် (Next point)**  
Continue with another layer of detail. Include names of researchers, companies, institutions. If costs, funding, or market size are known, mention them. Draw connections to everyday life.

**၃။ သိပ္ပံနောက်ခံ (Science behind it)**  
Explain how the technology or discovery works, breaking it down step by step. Use parenthetical English terms for clarity. Keep the tone conversational.

**၄။ အနာဂတ်အလားအလာ (Future outlook)**  
What comes next? What are experts saying? Could this affect Myanmar directly or indirectly? End with a thought‑provoking note.

**အနှစ်ချုပ် (Conclusion):**  
Wrap up the entire story in 2‑3 sentences that reinforce the main takeaway and leave the reader feeling informed and optimistic.

📌 Hashtags (4‑6 relevant, mixing English and Burmese‑script terms)

=== CONTENT RULES ===
1. The post MUST be long and detailed — at least 800+ words in Burmese. Avoid shallow summaries.  
2. Write entirely in natural, grammatically correct Burmese. Use formal yet warm language.  
3. Bold important keywords, technical names, and numbers using Telegram Markdown: *bold* (single asterisks, no spaces).  
4. Always introduce English technical terms alongside their Burmese explanation in parentheses, and bold both on first use.  
5. Use numbered sections (၁။, ၂။, ၃။ …) with bold sub‑headlines.  
6. Incorporate storytelling elements — e.g., a problem, a breakthrough, the people behind it, and the impact.  
7. Add at least one analogy that a rural or urban Myanmar reader can easily understand (e.g., comparing a new chip’s speed to the flow of the Irrawaddy river).  
8. If the news has any possible connection to Myanmar (local researchers, market implications, environmental impact), highlight it.  
9. Cite sources by name if they were mentioned in the fetched articles (e.g., “Nature ဂျာနယ်တွင် ဖော်ပြချက်အရ…”), but do not fabricate.  
10. Generate exactly 4‑6 hashtags at the end, combining English keywords and Burmese‑script ones (e.g., #AI #မြန်မာ သိပ္ပံ #FutureTech).  
11. The final output MUST be a single, valid JSON object — no extra text, no markdown code fences.

=== FINAL OUTPUT FORMAT ===
Output ONLY the raw JSON string as shown below:

{
  "topic": "The specific topic chosen (in English)",
  "content": "The entire Telegram post in Burmese, fully formatted with Telegram Markdown",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}

Do NOT wrap the JSON in triple backticks or any other formatting. The string must be directly parseable JSON.`;
    const prompt1 = [
      `You are an expert science and technology journalist  and social media manager creating content for a Myanmar audience..`,
      `The tone should be kind, friendly, and professional.`,
      `Today's date is ${today}.`,
      `Your task is to research the very latest news and breakthroughs in the field of "${randomField}".`,
      ``,
      `First, use the getLatestNews function to fetch real-time news articles about this topic.`,
      `When calling getLatestNews, use short topical queries like "${randomField} breakthrough" or "${randomField} latest".`,
      `Do NOT include year numbers (like 2024, 2025, 2026) in your search queries — the function already filters for recent articles.`,
      `You may call getLatestNews multiple times with different queries if needed to find the most interesting stories.`,
      ``,
      `After reviewing the news results, write an engaging, informative Telegram post about the most interesting finding.`,
      `Answer entirely in the Burmese language (မြန်မာဘာသာ).`,
      ``,
      `=== WRITING STYLE GUIDE ===`,
      `Follow this exact writing style and structure (study this example carefully):`,
      ``,

      ``,
      `=== CONTENT RULES ===`,
      `1. Start with an attention-grabbing headline/hook that makes people want to read more.`,
      `2. Write a compelling introduction paragraph with specific names, numbers, and context.`,
      `3. Break the body into numbered sections (၁။, ၂။, ၃။, etc.) with bold sub-headlines.`,
      `4. Each section should explain a key aspect in detail — use analogies and parenthetical explanations for technical terms.`,
      `5. Include specific facts: names of people, companies, institutions, dollar amounts, dates, technical specs.`,
      `6. End with a forward-looking conclusion or summary (အနှစ်ချုပ်).`,
      `7. The post should be LONG and DETAILED (at least 1000+ words in Burmese) — NOT a short summary.`,
      `8. Use Telegram Markdown: *bold* for key terms, technical names, and emphasis.`,
      `9. Write English technical terms alongside Burmese explanations in parentheses, e.g., "Multimodal Reasoning Model (အာရုံခံစားမှုစုံသုံးပြီး စဉ်းစားနိုင်တဲ့ မော်ဒယ်)".`,
      `10. Generate 4-6 relevant hashtags (mix of English and topic-specific).`,
      ``,
      `IMPORTANT: Your FINAL output MUST be a valid JSON object with the following structure:`,
      `{`,
      `  "topic": "The specific topic chosen",`,
      `  "content": "The main text content of the post formatted with Telegram Markdown",`,
      `  "hashtags": ["#tag1", "#tag2"]`,
      `}`,
      `Do NOT wrap the JSON in markdown blocks (e.g. \`\`\`json). Output ONLY the raw JSON string.`,
    ].join('\n');

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

    return parsed;
  }
}
