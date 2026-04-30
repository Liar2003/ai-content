import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { IGenerativeAiService, GeneratedContent } from '../interfaces/IAiGenerator';
import type { INewsService } from '../interfaces/INewsService';

/**
 * List of scientific and technological fields for content diversity.
 */
const FIELDS: string[] = [
  'Quantum Computing', 'Biotechnology', 'Astrophysics', 'Robotics',
  'Artificial Intelligence', 'Nanotechnology', 'Renewable Energy Tech',
  'Space Exploration', 'Neurotechnology', 'Materials Science',
  'Augmented & Virtual Reality (AR/VR)', 'Internet of Things (IoT)',
  'Cybersecurity & Cryptography', 'Edge Computing',
  '6G & Advanced Telecommunications', 'Human-Computer Interaction',
  'Genomics & CRISPR Editing', 'Synthetic Biology', 'Bioinformatics',
  'Bionics & Advanced Prosthetics', 'Anti-aging & Longevity Research',
  'Carbon Capture Technology', 'Climate Engineering',
  'Sustainable AgriTech', 'Oceanography & Marine Tech',
  'Next-Gen Battery Technology', 'Autonomous Vehicles & Smart Mobility',
  '3D Printing & Additive Manufacturing', 'Drones & UAV Technology',
  'Smart City Innovations', 'Nuclear Fusion Energy', 'Particle Physics',
  'Exoplanet Research', 'Blockchain & Web3', 'SOC & Chip Industry',
  'Electronic Devices',
];

/**
 * Define the exact JSON structure we expect from Gemini.
 * This eliminates the need for messy RegEx parsing later.
 */
const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: 'English topic name' },
    content: { type: Type.STRING, description: 'Full Burmese Markdown Telegram post' },
    image_prompt: { type: Type.STRING, description: 'English detailed description for image generation' },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Array of hashtags, e.g., ["#AI", "#Tech"]'
    },
  },
  required: ['topic', 'content', 'image_prompt', 'hashtags'],
};

/**
 * Tool Declaration for fetching news.
 */
const GET_LATEST_NEWS_TOOL = {
  functionDeclarations: [
    {
      name: 'getLatestNews',
      description: 'Fetch latest news articles for a specific scientific/tech topic. Returns array with title, description, source, URL.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Search query for the topic. Do not include years.' },
          count: { type: Type.NUMBER, description: 'Max articles to return (default 5).' },
        },
        required: ['query'],
      },
    },
  ],
};

export class GeminiService implements IGenerativeAiService {
  private readonly ai: GoogleGenAI;
  private readonly newsService: INewsService;

  constructor(apiKey: string, newsService: INewsService) {
    // Initialize GoogleGenAI SDK correctly
    this.ai = new GoogleGenAI({ apiKey });
    this.newsService = newsService;
  }

  async generateContent(): Promise<GeneratedContent> {
    const randomField = FIELDS[Math.floor(Math.random() * FIELDS.length)];
    const today = new Date().toISOString().split('T')[0];

    console.log(`[GeminiService] Initiating content generation for field: "${randomField}"`);

    // System Instructions set the permanent persona and rules for the AI
    const systemInstruction = `You are a top Burmese science/tech content creator for Telegram.
Your goal is to craft engaging, accurate, and high-quality posts in fluent, natural Burmese (မြန်မာဘာသာ).
Structure:
🔥 Strong hook/headline with emojis.
📌 Intro (who, what, where, when, why it matters).
📝 Body using numbered sections (၁။, ၂။, ၃။) with bold sub-headlines.
💬 Concluding thought/question to spark comments.

Guidelines:
- For technical terms: first use "English term (Burmese explanation)" with both bolded, e.g. **Large Language Model (ဘာသာစကားမော်ဒယ်အကြီးစား)**.
- Include at least one practical, Myanmar-relatable analogy if it fits naturally.
- Use Telegram Markdown: **bold** for emphasis.
- Generate an English image prompt (Midjourney/DALL-E style) with BIG bold Burmese text instruction inside the image.
- MUST output strictly matching the provided JSON schema.`;

    const userPrompt = `Today is ${today}. Research the latest developments in "${randomField}". 
1. Use the 'getLatestNews' tool to find a SPECIFIC, real breaking news event from the past 24 hours.
2. CRITICAL: Do NOT write a general overview or summary of what "${randomField}" is. You MUST write about a single, specific new discovery, product launch, or research paper that just happened.
3. If the first news result is generic, call 'getLatestNews' again with a different query.
4. If no specific news is found after multiple tries, use your internal knowledge to report on a very recent, highly specific development.
5. Generate the final output in the requested JSON format.`;

    // Initialize the model with schema and system instructions
    const model = 'gemini-3-flash-preview'; // Recommend Pro for complex reasoning and formatting, use flash-8b or flash for speed

    const chatSession = this.ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
        tools: [GET_LATEST_NEWS_TOOL],
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7, // Good balance of creativity and factualness
      }
    });

    try {
      let response = await chatSession.sendMessage({ message: userPrompt });
      let iterations = 0;
      const MAX_ITERATIONS = 5;

      // Function Calling Loop
      while (response.functionCalls && response.functionCalls.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`[GeminiService] Tool call iteration ${iterations}...`);

        const functionResponses = await Promise.all(
          response.functionCalls.map(async (call) => {
            if (call.name === 'getLatestNews') {
              const args = call.args as { query: string; count?: number };
              console.log(`[GeminiService] Fetching news for: "${args.query}"`);

              try {
                const articles = await this.newsService.fetchNews(args.query, args.count || 5);

                // 🚨 ပြင်ဆင်ထားသော အပိုင်း (Wrapped with functionResponse)
                return {
                  functionResponse: {
                    name: call.name,
                    response: { result: articles }
                  }
                };
              } catch (error) {
                console.error(`[GeminiService] News fetch error:`, error);

                // 🚨 ပြင်ဆင်ထားသော အပိုင်း (Error ဖြစ်ရင်လည်း functionResponse နဲ့ပဲ ပြန်ရမယ်)
                return {
                  functionResponse: {
                    name: call.name,
                    response: { error: `Fetch failed: ${error instanceof Error ? error.message : String(error)}` }
                  }
                };
              }
            }

            // Fallback for unknown functions
            return {
              functionResponse: {
                name: call.name,
                response: { error: 'Function not found or unsupported' }
              }
            };
          })
        );

        // functionResponses ကို Model ဆီ ပြန်ပို့မယ်
        response = await chatSession.sendMessage({
          message: functionResponses
        });
      }

      if (iterations >= MAX_ITERATIONS) {
        console.warn('[GeminiService] Reached maximum function call iterations.');
      }

      // Because we used responseSchema and application/json, the text is guaranteed to be a JSON string.
      const responseText = response.text;

      if (!responseText) {
        throw new Error("Received empty response from the model.");
      }

      // Safe Parsing
      const parsedData: GeneratedContent = JSON.parse(responseText);

      console.log(`[GeminiService] Successfully generated content for: ${parsedData.topic}`);
      return parsedData;

    } catch (error) {
      console.error('[GeminiService] Critical error during content generation:', error);
      throw new Error(`Content generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}