import type { INewsService, NewsArticle } from '../interfaces/INewsService';
import * as cheerio from 'cheerio';

/**
 * Fetches latest news using Google News RSS feeds, and extracts full text.
 * No API key required — parses the public RSS XML endpoint and fetches the articles.
 */
export class GoogleNewsRssService implements INewsService {
  private readonly baseUrl = 'https://news.google.com/rss/search';

  async fetchNews(query: string, count: number = 5): Promise<NewsArticle[]> {
    // Append "when:1d" to restrict results to the past 24 hours only, ensuring fresh topics
    const timeFilteredQuery = `${query} when:1d`;
    const url = `${this.baseUrl}?q=${encodeURIComponent(timeFilteredQuery)}&hl=en&gl=US&ceid=US:en`;

    console.log(`[NewsService] Fetching news for query: "${query}"`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIContentAgent/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Google News RSS returned HTTP ${response.status}`);
    }

    const xml = await response.text();
    const articles = this.parseRss(xml, count);

    // Concurrently fetch the full text for each article
    console.log(`[NewsService] Fetching full article contents...`);
    await Promise.all(
      articles.map(async (article) => {
        if (article.url) {
          article.fullText = await this.fetchArticleContent(article.url);
        }
      })
    );

    return articles;
  }

  /**
   * Fetches the actual article URL and extracts paragraphs using Cheerio.
   */
  private async fetchArticleContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(5000), // Prevent hanging on slow sites
      });
      if (!response.ok) return '';
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Strip out non-content elements
      $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();
      
      let text = '';
      $('p').each((_, el) => {
        const pText = $(el).text().trim();
        if (pText.length > 20) {
          text += pText + '\\n\\n';
        }
      });
      
      // Limit to 3000 chars to avoid blowing up the Gemini prompt limits
      return text.trim().slice(0, 3000);
    } catch (error) {
      console.warn(`[NewsService] Failed to fetch article content for ${url}:`, error instanceof Error ? error.message : String(error));
      return '';
    }
  }

  /**
   * Parses Google News RSS XML into structured NewsArticle objects.
   * Uses simple regex-based extraction to avoid adding an XML parser dependency.
   */
  private parseRss(xml: string, maxItems: number): NewsArticle[] {
    const articles: NewsArticle[] = [];

    // Extract all <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null && articles.length < maxItems) {
      const itemXml = match[1];

      const title = this.extractTag(itemXml, 'title');
      const link = this.extractTag(itemXml, 'link');
      const pubDate = this.extractTag(itemXml, 'pubDate');
      const source = this.extractTag(itemXml, 'source');
      const description = this.extractCdataTag(itemXml, 'description');

      if (title) {
        articles.push({
          title: this.decodeHtmlEntities(title),
          description: description
            ? this.stripHtml(this.decodeHtmlEntities(description))
            : '',
          source: source || 'Unknown',
          publishedAt: pubDate || '',
          url: link || '',
        });

      }
    }

    console.log(`[NewsService] Parsed ${articles.length} articles`);

    return articles;
  }

  /** Extracts the text content of a simple XML tag */
  private extractTag(xml: string, tag: string): string | null {
    // Handle CDATA-wrapped content
    const cdataMatch = xml.match(
      new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`)
    );
    if (cdataMatch) return cdataMatch[1].trim();

    // Handle plain text content
    const plainMatch = xml.match(
      new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
    );
    return plainMatch ? plainMatch[1].trim() : null;
  }

  /** Extracts CDATA content specifically */
  private extractCdataTag(xml: string, tag: string): string | null {
    const match = xml.match(
      new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`)
    );
    if (match) return match[1].trim();

    // Fallback to plain text
    return this.extractTag(xml, tag);
  }

  /** Strips HTML tags from a string */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /** Decodes common HTML entities */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }
}
