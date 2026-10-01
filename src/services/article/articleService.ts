import dns from 'dns/promises';
import net from 'net';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { llmService } from '../llm/llmService';

const FETCH_TIMEOUT_MS = 15000;

/** Shorter than this is a label or a widget caption, not a sentence of prose. */
const MIN_BLOCK_LENGTH = 20;

/**
 * Upper bound on blocks carried through the pipeline. Bounds the LLM filter's
 * input, and no article needs more: the text is capped at 10,000 characters
 * anyway, which no well-formed page reaches in 60 paragraphs.
 */
const MAX_BLOCKS = 60;

/**
 * A paragraph this long is prose whatever its link density -- Wikipedia body
 * text is dense with wikilinks and must not be mistaken for a nav list.
 */
const LINK_LIST_MAX_LENGTH = 200;
const LINK_LIST_DENSITY = 0.5;

/**
 * Floor on how much text the boilerplate filter may discard before we assume it
 * misread the page and keep everything instead.
 */
const MIN_KEPT_RATIO = 0.25;

/**
 * Two User-Agents, tried in order, because no single one works everywhere.
 *
 * Le Monde challenges the self-identifying bot string and serves its block page
 * with HTTP 200. lawlessfrench.com does the opposite: it 403s the Chrome string
 * and serves the article happily to the bot. Announcing ourselves honestly is
 * the better default, so the browser string is only the retry.
 */
const BOT_USER_AGENT = 'Mozilla/5.0 (compatible; ArticuloBot/1.0; +language-learning)';
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Statuses worth a second attempt under the other User-Agent. */
const RETRY_WITH_OTHER_AGENT = new Set([401, 402, 403, 406, 429]);

/**
 * BCP-47 tags for `Accept-Language`, so a site with regional editions serves the
 * one the learner is studying.
 *
 * This is not a nicety. Sending `en` first made Le Monde serve its *English*
 * edition -- an English page, extracted successfully, for a French lesson.
 */
const CONTENT_LANGUAGE_TAGS: Record<string, string> = {
  spanish: 'es',
  french: 'fr',
  japanese: 'ja',
  korean: 'ko',
};

/**
 * Phrases that mark an interstitial rather than an article: bot checks, consent
 * walls and "turn on JavaScript" shells.
 *
 * These pages are the reason this check exists at all. Le Monde serves its
 * challenge with **HTTP 200**, so `response.ok` passes, and at 209 characters it
 * cleared the old 100-character floor -- a lesson was built from a Cloudflare
 * notice, in English, for a French learner.
 */
const CHALLENGE_PATTERN =
  /client challenge|security checkpoint|checking your browser|verifying your browser|just a moment|enable javascript|javascript is required|captcha|access denied|unusual traffic|are you a robot/i;

const CHALLENGE_MESSAGE =
  'That site asked us to prove we are a browser, so the article could not be read. Open it in your browser and paste the text instead.';

/**
 * Visible-text length under which a page is treated as a shell rather than an
 * article.
 *
 * Measured on *text*, never on markup. A Vercel challenge is 31KB of inline CSS
 * and script wrapped around 276 characters of prose, so an early return keyed on
 * document size skipped the check on exactly the pages it exists to catch.
 */
const CHALLENGE_MAX_TEXT_LENGTH = 1500;

/**
 * Index-page signal. Measured across real pages: homepages run 0.51-0.70 link
 * density with 73-91 character paragraphs, articles 0.18-0.20 with 371-729.
 * Both conditions must hold, so a link-dense encyclopedia article stays.
 */
const INDEX_LINK_DENSITY = 0.35;
const INDEX_MEAN_BLOCK_LENGTH = 150;

/**
 * Floor for URL extraction, well above the 100 that let a 209-character block
 * page through. Kept under 600 deliberately: lawlessfrench.com's abbey piece is
 * a genuine 587-character article, and a floor that rejects it is too strict.
 */
const MIN_URL_ARTICLE_LENGTH = 300;

/**
 * Jina Reader renders the page in a real browser and returns Markdown, which is
 * the only way this server sees a JavaScript-built page -- both local
 * extractors parse whatever HTML the origin sent, and run no scripts.
 *
 * It is slower than a plain fetch, so it gets a longer budget than
 * FETCH_TIMEOUT_MS and is only ever reached after local extraction has failed.
 */
const READER_ENDPOINT = 'https://r.jina.ai/';
const READER_TIMEOUT_MS = 25000;

/** Markdown left by the reader: images, link syntax, heading rules, emphasis. */
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g;
const MARKDOWN_DECORATION = /^[#>\s*_-]+|[*_`]+/g;

/** `== Heading ==` lines in a Wikipedia plaintext extract. */
const WIKI_HEADING = /^=+\s.*\s=+$/;

/** Namespaces that are not articles: Special:, Catégorie:, Talk: and friends. */
const WIKI_NON_ARTICLE = /^[A-Za-zÀ-ÿ_]+:/;

/**
 * Bracketed editorial marks that encyclopedias leave inline: reference numbers
 * and the maintenance tags beside them. They are extraction residue, not words
 * to learn, and the model treats them as text -- "[ 1 ]" was being offered as
 * vocabulary.
 *
 * Deliberately narrow. A bracket is only dropped when its contents are a short
 * reference label or one of the known editorial phrases; brackets in prose stay.
 */
const FOOTNOTE_MARKER = /\[\s*(?:\d{1,3}|[a-z]|[a-z]\s*\d{1,3}|n\s*\d{1,3})\s*\]/gi;
const EDITORIAL_MARKER =
  /\[\s*(?:citation needed|cita requerida|réf\.?[^\]]{0,20}|c'est-à-dire\s*\?|edit|editar(?:\s+datos[^\]]{0,20})?|要出典|출처\s*필요)\s*\]/gi;

/**
 * True for any address that is not routable on the public internet: loopback,
 * RFC1918 private ranges, link-local (which covers cloud metadata endpoints at
 * 169.254.169.254), carrier-grade NAT, and their IPv6 equivalents.
 */
function isPrivateAddress(address: string): boolean {
  const version = net.isIP(address);

  if (version === 4) {
    const parts = address.split('.').map(Number);
    const [a = 0, b = 0] = parts;

    if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast and reserved
    return false;
  }

  if (version === 6) {
    const normalized = address.toLowerCase().split('%')[0] ?? '';
    if (normalized === '::' || normalized === '::1') return true; // unspecified, loopback
    if (normalized.startsWith('fe80')) return true; // link-local
    if (/^f[cd]/.test(normalized)) return true; // unique local
    // IPv4-mapped (::ffff:127.0.0.1) must be judged on the embedded address.
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return false;
  }

  // Not a literal address; the caller resolves hostnames before calling this.
  return true;
}

/**
 * "We could not read this page", as opposed to "this page is not an article".
 *
 * Only the first is worth retrying through the hosted reader. A homepage is a
 * homepage however it is fetched, so re-reading it would spend a slow request to
 * reach the same rejection -- but a JavaScript shell or a blocked fetch is
 * exactly what the reader exists to get past.
 */
class UnreadableError extends AppError {
  constructor(message: string) {
    super(400, message);
    Object.setPrototypeOf(this, UnreadableError.prototype);
  }
}

export class ArticleService {
  private readonly MAX_ARTICLE_LENGTH = 10000;
  private readonly MIN_ARTICLE_LENGTH = 100;

  async extractFromUrl(
    url: string,
    language?: string
  ): Promise<{ title: string; text: string; truncated: boolean }> {
    try {
      await this.assertFetchableUrl(url);

      // Wikipedia publishes its article text as data, so there is nothing to
      // guess at and no boilerplate to filter. Taken before anything else.
      const viaWikipedia = await this.extractFromWikipedia(url);
      if (viaWikipedia) {
        const { text, truncated } = this.truncateToLimit(viaWikipedia.text);
        this.validateArticle(text);
        return { title: viaWikipedia.title, text, truncated };
      }

      try {
        return await this.extractByScraping(url, language);
      } catch (failure) {
        // Only "we could not read it" is worth a second, slower attempt.
        if (!(failure instanceof UnreadableError)) throw failure;

        const viaReader = await this.extractWithReader(url);
        if (viaReader) return viaReader;

        // The local failure names the real problem; the reader's silence does
        // not. Report the first one.
        throw failure;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new AppError(400, 'The article took too long to load. Try pasting the text instead.');
      }
      throw new AppError(400, 'Failed to extract article content');
    }
  }

  /**
   * Rejects URLs that could be used to reach anything but the public internet.
   *
   * This endpoint fetches a URL supplied by the user and returns its text back to
   * them, which is a server-side request forgery primitive: on a cloud host,
   * `http://169.254.169.254/latest/meta-data/` reaches the instance metadata
   * service, and `http://localhost:5432` reaches our own database. Checking the
   * protocol alone -- as this used to -- does not stop either.
   *
   * So the hostname is resolved and every address it maps to is checked against
   * the private ranges before we connect. Resolving first also blocks the obvious
   * bypasses: a public hostname with a private A record, and decimal or IPv6
   * spellings of a loopback address.
   *
   * Remaining gap, accepted deliberately: DNS could return a public address here
   * and a private one when the fetch re-resolves (a rebinding attack). Closing
   * that means pinning the resolved address through the connection, which needs a
   * custom agent. Documented in docs/SCALE.md rather than half-built.
   */
  private async assertFetchableUrl(url: string): Promise<void> {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      throw new AppError(400, 'Invalid article URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new AppError(400, 'Article URL must start with http:// or https://');
    }

    let addresses: string[];
    try {
      const resolved = await dns.lookup(parsed.hostname, { all: true });
      addresses = resolved.map((entry) => entry.address);
    } catch {
      throw new AppError(400, 'Could not resolve that URL. Check the address and try again.');
    }

    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
      throw new AppError(400, 'That URL points to a private address and cannot be fetched.');
    }
  }

  /** Fetch the page and read the article out of its HTML. */
  private async extractByScraping(
    url: string,
    language?: string
  ): Promise<{ title: string; text: string; truncated: boolean }> {
    const html = await this.fetchArticleHtml(url, language);
    this.assertNotAnInterstitial(html);

    // Readability (Firefox Reader Mode) scores elements on how article-like
    // they look and returns the winning subtree, so it handles nesting and
    // strips sidebars/comments. The regex extractor stays as a fallback for
    // pages it can't score.
    const viaReadability = this.extractWithReadability(html, url);
    const title = viaReadability?.title ?? this.extractTitle(html);
    const blocks =
      viaReadability && this.totalLength(viaReadability.blocks) >= this.MIN_ARTICLE_LENGTH
        ? viaReadability.blocks
        : this.extractTextContent(html);

    this.assertLooksLikeArticle(blocks, viaReadability?.linkDensity ?? 0);

    const body = await this.filterToArticleBody(blocks);
    const { text, truncated } = this.truncateToLimit(body.join('\n\n'));

    if (text.length < MIN_URL_ARTICLE_LENGTH) {
      throw new UnreadableError(
        "There wasn't enough article text on that page. If it's behind a login or loads as you scroll, paste the text instead."
      );
    }

    this.validateArticle(text);

    return { title, text, truncated };
  }

  /**
   * Last resort: let a hosted reader render the page and return its text.
   *
   * This is the only path that sees a JavaScript-built page, because it runs a
   * real browser elsewhere. Disabled unless `JINA_API_KEY` is set, and silent
   * on every failure -- the caller falls back to reporting the local error,
   * which describes the real problem more precisely than "the reader also
   * failed" would.
   *
   * Its output is treated as another extractor's guess, not as truth: the same
   * boilerplate filter and article checks run over it.
   */
  private async extractWithReader(
    url: string
  ): Promise<{ title: string; text: string; truncated: boolean } | null> {
    if (!env.JINA_API_KEY) return null;

    try {
      const response = await fetch(`${READER_ENDPOINT}${url}`, {
        signal: AbortSignal.timeout(READER_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${env.JINA_API_KEY}`,
          Accept: 'text/plain',
          'X-Return-Format': 'markdown',
        },
      });
      if (!response.ok) return null;

      const markdown = await response.text();
      const { title, blocks } = this.blocksFromMarkdown(markdown);
      if (blocks.length === 0) return null;

      const body = await this.filterToArticleBody(blocks);
      const { text, truncated } = this.truncateToLimit(body.join('\n\n'));

      if (text.length < MIN_URL_ARTICLE_LENGTH) return null;

      return { title, text, truncated };
    } catch {
      return null;
    }
  }

  /**
   * Paragraphs from the reader's Markdown.
   *
   * The reader prefixes its output with `Title:` / `URL Source:` / `Published
   * Time:` lines before `Markdown Content:`, and leaves link and image syntax
   * inline. None of that is prose, and `[text](url)` reaching a vocabulary
   * prompt would be read as words.
   */
  private blocksFromMarkdown(markdown: string): { title: string; blocks: string[] } {
    const titleLine = markdown.match(/^Title:\s*(.+)$/m);
    const contentStart = markdown.indexOf('Markdown Content:');
    const content =
      contentStart === -1
        ? markdown
        : markdown.slice(contentStart + 'Markdown Content:'.length);

    const blocks: string[] = [];

    for (const paragraph of content.split(/\n{2,}/)) {
      if (blocks.length >= MAX_BLOCKS) break;

      const text = this.cleanBlockText(
        paragraph
          .replace(MARKDOWN_IMAGE, ' ')
          .replace(MARKDOWN_LINK, '$1')
          .replace(MARKDOWN_DECORATION, ' ')
      );

      if (text.length <= MIN_BLOCK_LENGTH) continue;
      blocks.push(text);
    }

    return {
      title: this.cleanText(titleLine?.[1] ?? '') || 'Untitled Article',
      blocks,
    };
  }

  /**
   * Wikipedia articles, read from the API instead of scraped.
   *
   * This is the one extraction path with nothing to guess at. `explaintext`
   * returns the article body as plain text -- no infobox, no image captions, no
   * reference markers, no "[editar datos en Wikidata]" -- so it needs neither
   * the boilerplate filter nor the article checks, and it costs no LLM call.
   * That is why the Dashboard recommends Wikipedia first.
   *
   * Returns null for anything that is not a Wikipedia article URL, including
   * `Special:` and other non-article namespaces, which fall through to the
   * normal pipeline.
   */
  private async extractFromWikipedia(
    url: string
  ): Promise<{ title: string; text: string } | null> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }

    const host = parsed.hostname.match(/^([a-z]{2,3}(?:-[a-z]+)?)\.wikipedia\.org$/i);
    const path = parsed.pathname.match(/^\/wiki\/(.+)$/);
    if (!host?.[1] || !path?.[1]) return null;

    let title: string;
    try {
      title = decodeURIComponent(path[1]).replace(/_/g, ' ');
    } catch {
      return null;
    }

    if (WIKI_NON_ARTICLE.test(title)) return null;

    try {
      const endpoint = new URL(`https://${host[1]}.wikipedia.org/w/api.php`);
      endpoint.search = new URLSearchParams({
        action: 'query',
        prop: 'extracts',
        explaintext: '1',
        // Follow "Baleine" -> whatever it redirects to, as a reader would.
        redirects: '1',
        format: 'json',
        titles: title,
      }).toString();

      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': BOT_USER_AGENT, Accept: 'application/json' },
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as {
        query?: { pages?: Record<string, { title?: string; extract?: string; missing?: unknown }> };
      };

      const page = Object.values(payload.query?.pages ?? {})[0];
      if (!page || page.missing !== undefined || !page.extract) return null;

      const text = this.blocksFromWikiExtract(page.extract).join('\n\n');
      if (text.length < this.MIN_ARTICLE_LENGTH) return null;

      return { title: page.title?.trim() || 'Untitled Article', text };
    } catch {
      // A failure here is not fatal: the page is still a normal URL, and the
      // scraping path can have a go at it.
      return null;
    }
  }

  /**
   * Paragraphs from a Wikipedia plaintext extract.
   *
   * The extract separates paragraphs with single newlines and marks sections
   * with `== Heading ==` lines. The headings are navigation, not prose, so they
   * are dropped rather than read aloud to a learner mid-article.
   */
  private blocksFromWikiExtract(extract: string): string[] {
    const blocks: string[] = [];

    for (const line of extract.split('\n')) {
      if (blocks.length >= MAX_BLOCKS) break;

      // Same cleanup as the scraped path: the API strips reference markers but
      // leaves the punctuation around them stranded.
      const text = this.cleanBlockText(line);
      if (text.length <= MIN_BLOCK_LENGTH) continue;
      if (WIKI_HEADING.test(text)) continue;

      blocks.push(text);
    }

    return blocks;
  }

  /**
   * Fetches a page, retrying once under the other User-Agent when the first
   * attempt is refused.
   *
   * Sites disagree about which client they trust, in both directions, so one
   * string cannot serve them all -- see `BOT_USER_AGENT`. A refusal that
   * survives both attempts is reported with the *second* status, which is the
   * one the reader can act on.
   */
  private async fetchArticleHtml(url: string, language?: string): Promise<string> {
    const headers = (userAgent: string): Record<string, string> => ({
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      // The target language first, so a site with regional editions serves the
      // one being studied rather than an English translation of it.
      'Accept-Language': language
        ? `${CONTENT_LANGUAGE_TAGS[language] ?? 'en'},en;q=0.5`
        : 'en;q=0.8,*;q=0.5',
    });

    // Without a timeout an unresponsive host holds the request open
    // indefinitely, and this endpoint already costs several LLM calls.
    const attempt = (userAgent: string) =>
      fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: headers(userAgent),
      });

    let response = await attempt(BOT_USER_AGENT);

    if (!response.ok && RETRY_WITH_OTHER_AGENT.has(response.status)) {
      response = await attempt(BROWSER_USER_AGENT);
    }

    const html = await response.text();

    if (!response.ok) {
      // The body is read before the status is trusted, because bot protection
      // picks a status more or less at random: Vercel's Attack Challenge Mode
      // answers 429, Cloudflare 403. Reporting 429 as rate limiting told the
      // reader to "try again in a few minutes", which would never have worked —
      // the challenge is served every time.
      if (this.looksLikeInterstitial(html)) {
        throw new UnreadableError(CHALLENGE_MESSAGE);
      }
      throw new UnreadableError(this.describeFetchFailure(response.status));
    }

    return html;
  }

  /** Names the real reason a fetch failed, so the reader can act on it. */
  private describeFetchFailure(status: number): string {
    if (status === 402 || status === 403 || status === 451) {
      return 'That site requires a subscription or blocks automated readers. Open it in your browser and paste the text instead.';
    }
    if (status === 404) {
      return "That page doesn't exist. Check the link and try again.";
    }
    if (status === 429) {
      return 'That site is limiting how often it can be read. Try again in a few minutes, or paste the text instead.';
    }
    if (status >= 500) {
      return "That site isn't responding properly right now. Try again shortly.";
    }
    return 'That page could not be read. Try pasting the text instead.';
  }

  /** True for a bot check, consent wall or JavaScript shell. */
  private looksLikeInterstitial(html: string): boolean {
    // Script and style bodies are stripped first. Without that, a page built by
    // JavaScript measures as tens of thousands of "text" characters and clears
    // the length test on the strength of its own bundle.
    const text = this.cleanText(
      html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    );

    // The length test is what keeps a real article safe: an article may well
    // discuss captchas, but it is not 300 words long in total.
    return text.length <= CHALLENGE_MAX_TEXT_LENGTH && CHALLENGE_PATTERN.test(text);
  }

  /** Rejects bot checks, consent walls and JavaScript shells. */
  private assertNotAnInterstitial(html: string): void {
    if (this.looksLikeInterstitial(html)) {
      throw new UnreadableError(CHALLENGE_MESSAGE);
    }
  }

  /** Rejects homepages and section indexes, which are not one article. */
  private assertLooksLikeArticle(blocks: string[], linkDensity: number): void {
    if (blocks.length === 0) return;

    const meanLength = this.totalLength(blocks) / blocks.length;

    if (linkDensity > INDEX_LINK_DENSITY && meanLength < INDEX_MEAN_BLOCK_LENGTH) {
      throw new AppError(
        400,
        'That looks like a homepage or a section listing rather than one article. Open the article you want and copy its link.'
      );
    }
  }

  /** Returns null when Readability can't identify an article. */
  private extractWithReadability(
    html: string,
    url: string
  ): { title: string; blocks: string[]; linkDensity: number } | null {
    try {
      // jsdom does not execute scripts unless `runScripts` is set. Leave it
      // unset: this parses untrusted HTML from arbitrary sites.
      const dom = new JSDOM(html, { url });
      const article = new Readability(dom.window.document).parse();

      if (!article) return null;

      // Readability picks the right *subtree*; it does not promise the subtree
      // contains only prose. Captions, infobox cells and widget text come with
      // it, which is what `blocksFromHtml` and then the LLM filter are for.
      const content = article.content ?? '';
      const blocks = this.blocksFromHtml(content);
      if (blocks.length === 0) return null;

      return {
        title: this.cleanText(article.title ?? '') || 'Untitled Article',
        blocks,
        // Measured across the whole chosen subtree, not the surviving blocks:
        // the nav rows that mark a homepage are exactly what block filtering
        // has just removed, so measuring afterwards would hide the signal.
        linkDensity: this.linkDensity(content),
      };
    } catch {
      return null;
    }
  }

  /**
   * Paragraph-level blocks from a fragment of HTML, in document order.
   *
   * Parsed with jsdom rather than a regex, which fixes a corruption bug as a
   * side effect: `cleanText` replaces every inline tag with a space, so an
   * `<em>` inside a word produced "nous n' avons" and a trailing `<a>` produced
   * "en novembre ,". That text then went to the model, and
   * `normalizeVocabulary()` verifies each `surfaceForm` occurs *verbatim* --
   * so a stray space silently dropped a highlight. `textContent` has no such
   * problem and decodes entities on the way out.
   */
  private blocksFromHtml(html: string): string[] {
    try {
      const { document } = new JSDOM(`<body>${html}</body>`).window;
      const blocks: string[] = [];

      for (const paragraph of Array.from(document.querySelectorAll('p'))) {
        if (blocks.length >= MAX_BLOCKS) break;

        const text = this.cleanBlockText(paragraph.textContent ?? '');
        if (text.length <= MIN_BLOCK_LENGTH) continue;

        // The only structural drops safe to make here. A blanket ban on
        // `table` or `aside` inverts on real sites -- lawlessfrench.com lays
        // its article out in a <table>, so that rule deleted the article and
        // kept the donation plea. Anything subtler is the LLM filter's job.
        if (paragraph.closest('figcaption, form')) continue;
        if (this.isLinkList(paragraph, text)) continue;

        blocks.push(text);
      }

      return blocks;
    } catch {
      return [];
    }
  }

  /** Share of a fragment's visible text that sits inside links. */
  private linkDensity(html: string): number {
    try {
      const { document } = new JSDOM(`<body>${html}</body>`).window;

      const visible = (document.body.textContent ?? '').replace(/\s/g, '').length;
      if (visible === 0) return 0;

      const linked = Array.from(document.querySelectorAll('a')).reduce(
        (total, anchor) => total + (anchor.textContent ?? '').replace(/\s/g, '').length,
        0
      );

      return linked / visible;
    } catch {
      return 0;
    }
  }

  /** A short block that is mostly link text: a nav row or a "related" list. */
  private isLinkList(paragraph: Element, text: string): boolean {
    if (text.length >= LINK_LIST_MAX_LENGTH) return false;

    const visible = text.replace(/\s/g, '').length;
    if (visible === 0) return true;

    const linked = Array.from(paragraph.querySelectorAll('a')).reduce(
      (total, anchor) => total + (anchor.textContent ?? '').replace(/\s/g, '').length,
      0
    );

    return linked / visible > LINK_LIST_DENSITY;
  }

  private normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * One paragraph of prose, with extraction residue removed.
   *
   * Removing a reference marker leaves the space that sat around it, which
   * strands the punctuation that followed: "«...capturar».[12], Scoresby"
   * becomes "». , Scoresby". So markers go first, then any space before a comma
   * or full stop is closed up.
   *
   * Only `,` and `.` are closed up. French puts a genuine space before `; : ? !`
   * and inside `« »`, and collapsing those would corrupt correctly typeset text.
   */
  private cleanBlockText(raw: string): string {
    return this.normalizeWhitespace(
      this.normalizeWhitespace(raw)
        .replace(FOOTNOTE_MARKER, '')
        .replace(EDITORIAL_MARKER, '')
        // A comma left stranded after a full stop once the marker between them
        // is gone: "capturar».[12], Scoresby" -> "capturar». , Scoresby". The
        // space is required, so a legitimate "etc., y" is untouched.
        .replace(/([.!?])\s+,/g, '$1')
        .replace(/\s+([,.])/g, '$1')
    );
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

  private extractTextContent(html: string): string[] {
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

    let best: string[] = [];
    for (const candidate of candidates) {
      const extracted = this.blocksFromHtml(candidate);
      if (this.totalLength(extracted) > this.totalLength(best)) {
        best = extracted;
      }
    }

    if (best.length > 0) {
      return best;
    }

    // No usable paragraphs anywhere: strip tags from the full document and
    // treat the result as a single block.
    const stripped = this.cleanText(text.replace(/<[^>]+>/g, ' '));
    return stripped ? [stripped] : [];
  }

  private totalLength(blocks: string[]): number {
    return blocks.reduce((total, block) => total + block.length, 0);
  }

  /**
   * Narrows scraped blocks to the article body, using the model as the judge.
   *
   * Every failure path returns the blocks unchanged. A filter that silently eats
   * the article is far worse than one that leaves a stray line in: the lesson is
   * built from whatever this returns, and four more LLM calls are spent on it.
   * So the model's answer is only taken when it is well-formed, in range, and
   * leaves most of the text standing.
   */
  private async filterToArticleBody(blocks: string[]): Promise<string[]> {
    // One block is the whole article by definition, and there is nothing for the
    // model to choose between.
    if (blocks.length < 2) return blocks;

    try {
      const { keep } = await llmService.selectArticleBody(blocks);

      const kept = [...new Set(keep)]
        .filter((index) => index < blocks.length)
        .sort((a, b) => a - b)
        .map((index) => blocks[index] as string);

      // Keeping almost nothing means the model misread the page, not that the
      // page is almost all boilerplate -- a page that really is gets rejected by
      // the article checks instead.
      if (this.totalLength(kept) < this.totalLength(blocks) * MIN_KEPT_RATIO) {
        return blocks;
      }

      return kept;
    } catch {
      // The filter is an improvement, not a dependency. If the model is
      // unreachable the lesson should still be created.
      return blocks;
    }
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