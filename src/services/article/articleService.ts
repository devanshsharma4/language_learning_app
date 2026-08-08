import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { AppError } from '../../middleware/errorHandler';

const FETCH_TIMEOUT_MS = 15000;

export class ArticleService {
  private readonly MAX_ARTICLE_LENGTH = 10000;
  private readonly MIN_ARTICLE_LENGTH = 100;

  async extractFromUrl(
    url: string
  ): Promise<{ title: string; text: string; truncated: boolean }> {
    try {
      this.assertFetchableUrl(url);

      // Without a timeout an unresponsive host holds the request open
      // indefinitely, and this endpoint already costs four LLM calls.
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          // Some sites serve a stub or a block page to unknown clients.
          'User-Agent': 'Mozilla/5.0 (compatible; LanguageLearningBot/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        throw new AppError(400, 'Failed to fetch article from URL');
      }

      const html = await response.text();

      // Readability (Firefox Reader Mode) scores elements on how article-like
      // they look and returns the winning subtree, so it handles nesting and
      // strips sidebars/comments. The regex extractor stays as a fallback for
      // pages it can't score.
      const viaReadability = this.extractWithReadability(html, url);
      if (viaReadability && viaReadability.text.length >= this.MIN_ARTICLE_LENGTH) {
        const { text, truncated } = this.truncateToLimit(viaReadability.text);
        return { title: viaReadability.title, text, truncated };
      }

      const title = this.extractTitle(html);
      const { text, truncated } = this.truncateToLimit(this.extractTextContent(html));

      this.validateArticle(text);

      return { title, text, truncated };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new AppError(400, 'The article took too long to load. Try pasting the text instead.');
      }
      throw new AppError(400, 'Failed to extract article content');
    }
  }

  /**
   * Blocks non-web protocols so a URL can't be used to reach the local
   * filesystem or internal services (file://, etc.).
   *
   * Note: this does NOT stop requests to private IPs — a full SSRF defense
   * needs DNS resolution plus an address-range check before connecting.
   */
  private assertFetchableUrl(url: string): void {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      throw new AppError(400, 'Invalid article URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new AppError(400, 'Article URL must start with http:// or https://');
    }
  }

  /** Returns null when Readability can't identify an article. */
  private extractWithReadability(
    html: string,
    url: string
  ): { title: string; text: string } | null {
    try {
      // jsdom does not execute scripts unless `runScripts` is set. Leave it
      // unset: this parses untrusted HTML from arbitrary sites.
      const dom = new JSDOM(html, { url });
      const article = new Readability(dom.window.document).parse();

      if (!article) return null;

      // Reuse the paragraph extractor on Readability's cleaned HTML rather than
      // its `textContent`, which runs paragraphs together. Readability picks
      // the right subtree; this preserves the blank lines between paragraphs.
      const text =
        this.extractParagraphs(article.content ?? '') ||
        this.cleanText(article.textContent ?? '');

      if (!text) return null;

      return {
        title: this.cleanText(article.title ?? '') || 'Untitled Article',
        text,
      };
    } catch {
      return null;
    }
  }

  /**
   * Caps extracted text at MAX_ARTICLE_LENGTH, cutting at a paragraph break
   * where possible (then a sentence, then hard).
   *
   * URL extraction only. A long page would otherwise be rejected outright and
   * the reader cannot edit a site they don't control. Pasted text keeps the
   * hard error, since they can trim it and the Dashboard shows a live count.
   */
  private truncateToLimit(text: string): { text: string; truncated: boolean } {
    if (text.length <= this.MAX_ARTICLE_LENGTH) {
      return { text, truncated: false };
    }

    const clipped = text.slice(0, this.MAX_ARTICLE_LENGTH);
    const halfway = this.MAX_ARTICLE_LENGTH * 0.5;

    // Prefer a paragraph break, then a sentence end, so the lesson never opens
    // or closes mid-thought. Both must land past the halfway mark, otherwise
    // we would discard most of the article to find a tidy boundary.
    const lastParagraph = clipped.lastIndexOf('\n\n');
    if (lastParagraph > halfway) {
      return { text: clipped.slice(0, lastParagraph).trim(), truncated: true };
    }

    const lastSentence = Math.max(
      clipped.lastIndexOf('. '),
      clipped.lastIndexOf('! '),
      clipped.lastIndexOf('? ')
    );
    if (lastSentence > halfway) {
      return { text: clipped.slice(0, lastSentence + 1).trim(), truncated: true };
    }

    return { text: clipped.trim(), truncated: true };
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
    // Remove non-content elements outright.
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

    // Container hints. These are only *candidates*: a non-greedy regex stops at
    // the first closing tag, which for nested markup truncates mid-content
    // (regex cannot match balanced tags). Narrowing to the first match that
    // happened to hit would then discard the real article, so instead score
    // every candidate — including the untouched document — and keep whichever
    // yields the most text.
    const contentPatterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    const candidates = [text];
    for (const pattern of contentPatterns) {
      const match = text.match(pattern);
      if (match) {
        candidates.push(match[1]);
      }
    }

    let best = '';
    for (const candidate of candidates) {
      const extracted = this.extractParagraphs(candidate);
      if (extracted.length > best.length) {
        best = extracted;
      }
    }

    if (best.length > 0) {
      return best;
    }

    // No usable paragraphs anywhere: strip tags from the full document.
    return this.cleanText(text.replace(/<[^>]+>/g, ' '));
  }

  /** Joined text of every <p> in a fragment, skipping short boilerplate. */
  private extractParagraphs(fragment: string): string {
    const paragraphs: string[] = [];

    for (const match of fragment.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const cleanedText = this.cleanText(match[1]);
      if (cleanedText.length > 20) {
        paragraphs.push(cleanedText);
      }
    }

    return paragraphs.join('\n\n');
  }

  private cleanText(text: string): string {
    return text
      // Inline markup (<br>, <em>, <a>...) survives paragraph extraction and
      // would otherwise be handed to the LLM verbatim.
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Numeric entities in decimal (&#8217;) and hex (&#x27;) form — common in
      // French text for apostrophes and accents.
      .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
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