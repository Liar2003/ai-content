import { GoogleGenAI, Type } from '@google/genai';
import type { IGenerativeAiService, GeneratedContent } from '../interfaces/IAiGenerator';

/**
 * List of scientific and technological fields for content diversity.
 * A random field is selected on each invocation.
 */
const FIELDS: string[] = [
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
];

/**
 * Implements IGenerativeAiService using the Google Gen AI SDK.
 * Uses the Google Search tool for real-time web research and
 * structured output (JSON schema) for reliable parsing.
 */
export class GeminiService implements IGenerativeAiService {
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateContent(): Promise<GeneratedContent> {
    const randomField = FIELDS[Math.floor(Math.random() * FIELDS.length)];

    const prompt = [
      `You are an expert science and technology journalist.`,
      `Your task is to research the very latest news and breakthroughs in the field of "${randomField}" using web search.`,
      ``,
      `Then, write an engaging, informative Telegram post about the most interesting finding.`,
      ``,
      `Requirements:`,
      `- The post must be concise (under 300 words) but insightful.`,
      `- Write in an engaging, accessible tone — imagine your audience is curious but not necessarily expert.`,
      `- Include specific facts, names, institutions, or dates discovered from your search.`,
      `- The content field must be formatted for Telegram Markdown (use *bold*, _italic_, and line breaks).`,
      `- Generate 3-5 relevant hashtags.`,
      `- The topic field should be a short, specific title for the discovery or news item.`,
    ].join('\n');

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: {
              type: Type.STRING,
              description: 'The specific topic chosen based on the search results.',
            },
            content: {
              type: Type.STRING,
              description: 'The main text content of the post.',
            },
            hashtags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'Suggested hashtags for the post.',
            },
          },
          required: ['topic', 'content', 'hashtags'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsed: GeneratedContent = JSON.parse(text);

    if (!parsed.topic || !parsed.content || !Array.isArray(parsed.hashtags)) {
      throw new Error(`Malformed AI response: ${text}`);
    }

    return parsed;
  }
}
