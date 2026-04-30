/**
 * Represents a single news article fetched from an external source.
 */
export interface NewsArticle {
  /** Headline / title of the article */
  title: string;
  /** Short description or snippet */
  description: string;
  /** Source publication name */
  source: string;
  /** Publication date string */
  publishedAt: string;
  /** Direct URL to the article */
  url: string;
  /** Full extracted text content of the article, if available */
  fullText?: string;
}

/**
 * Contract for any service that fetches news articles.
 */
export interface INewsService {
  /**
   * Fetches recent news articles for a given query/topic.
   * @param query - The search term or topic
   * @param count - Maximum number of articles to return
   * @returns Array of news articles
   */
  fetchNews(query: string, count?: number): Promise<NewsArticle[]>;
}
