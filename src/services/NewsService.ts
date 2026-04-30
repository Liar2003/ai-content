import type { INewsService, NewsArticle } from '../interfaces/INewsService';

/**
 * Fetches latest news using Google News RSS feeds.
 * No API key required — parses the public RSS XML endpoint.
 */
export class GoogleNewsRssService implements INewsService {
  private readonly baseUrl = 'https://news.google.com/rss/search';

  async fetchNews(query: string, count: number = 5): Promise<NewsArticle[]> {
    // Append "when:7d" to restrict results to the past 7 days
    const timeFilteredQuery = `${query} when:7d`;
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
    return this.parseRss(xml, count);
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
