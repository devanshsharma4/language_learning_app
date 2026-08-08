import { AppError } from '../../middleware/errorHandler';

export class ArticleService {
  private readonly MAX_ARTICLE_LENGTH = 10000;
  private readonly MIN_ARTICLE_LENGTH = 100;

  async extractFromUrl(url: string): Promise<{ title: string; text: string }> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new AppError(400, 'Failed to fetch article from URL');
      }

      const html = await response.text();
      
      const title = this.extractTitle(html);
      const text = this.extractTextContent(html);
      
      this.validateArticle(text);
      
      return { title, text };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(400, 'Failed to extract article content');
    }
  }

  validateArticle(text: string): void {
    if (text.length < this.MIN_ARTICLE_LENGTH) {
      throw new AppError(400, `Article too short. Minimum ${this.MIN_ARTICLE_LENGTH} characters required.`);
    }
    
    if (text.length > this.MAX_ARTICLE_LENGTH) {
      throw new AppError(400, `Article too long. Maximum ${this.MAX_ARTICLE_LENGTH} characters allowed.`);
    }
  }

  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return this.cleanText(titleMatch[1]);
    }
    
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      return this.cleanText(h1Match[1]);
    }
    
    return 'Untitled Article';
  }

  private extractTextContent(html: string): string {
    // Remove script and style elements
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Try to find main content areas
    const contentPatterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    
    for (const pattern of contentPatterns) {
      const match = text.match(pattern);
      if (match) {
        text = match[1];
        break;
      }
    }
    
    // Extract text from paragraphs
    const paragraphs: string[] = [];
    const paragraphMatches = text.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    
    for (const match of paragraphMatches) {
      const cleanedText = this.cleanText(match[1]);
      if (cleanedText.length > 20) {
        paragraphs.push(cleanedText);
      }
    }
    
    // If we found paragraphs, use them
    if (paragraphs.length > 0) {
      return paragraphs.join('\n\n');
    }
    
    // Fallback: remove all HTML tags and clean
    text = text.replace(/<[^>]+>/g, ' ');
    return this.cleanText(text);
  }

  private cleanText(text: string): string {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  detectLanguage(text: string): string {
    // Simple language detection based on character patterns
    // In production, you'd use a proper library or API
    
    const patterns = {
      spanish: /[áéíóúñ¿¡]/i,
      french: /[àâäçèéêëîïôùûü]/i,
      japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
      korean: /[\uAC00-\uD7AF\u1100-\u11FF]/
    };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }
    
    return 'english';
  }
}

export const articleService = new ArticleService();