import Anthropic from '@anthropic-ai/sdk';
import type { ZodType } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import {
  ArticleBodyResult,
  VocabularyExtractionResult,
  QuestionGenerationResult,
  VocabQuestionResult,
  WritingPromptResult,
  FeedbackResult,
  articleBodySchema,
  vocabularyExtractionSchema,
  questionGenerationSchema,
  vocabQuestionSchema,
  writingPromptSchema,
  feedbackSchema
} from './types';
import { promptTemplates } from './prompts';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 4000;

/** Total attempts per call, including the first. Parse failures are usually transient. */
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

class LLMService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY
    });
  }

  private async generateCompletion(prompt: string, temperature = 0.7): Promise<string> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    });

    // A response truncated at the token ceiling is never valid JSON, and silently
    // returning it produces a confusing parse error instead of the real cause.
    if (response.stop_reason === 'max_tokens') {
      throw new Error(`Response truncated at ${MAX_TOKENS} tokens`);
    }

    const content = response.content[0];
    if (!content) {
      throw new Error('Empty response from model');
    }
    if (content.type !== 'text') {
      throw new Error(`Unexpected content block type: ${content.type}`);
    }

    return content.text;
  }

  /**
   * Prompt the model, parse its JSON, and validate it against `schema`.
   *
   * Retries the whole call on a parse or validation failure, because that is the
   * single most likely failure in this pipeline and it is usually transient. Three
   * of the four lesson-creation calls run in parallel, so failing outright also
   * throws away work already paid for.
   *
   * Exhausting the retries raises a 503 AppError rather than falling through to a
   * generic 500, so the UI can tell the user it is worth trying again.
   */
  private async generateJSON<T>(prompt: string, schema: ZodType<T>, label: string): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown formatting or explanations.`;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.generateCompletion(jsonPrompt, 0.3);
        const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
        return schema.parse(JSON.parse(cleaned));
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[llm] ${label} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`);

        if (attempt < MAX_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, BASE_BACKOFF_MS * 2 ** (attempt - 1)));
        }
      }
    }

    console.error(`[llm] ${label} exhausted ${MAX_ATTEMPTS} attempts`, lastError);
    throw new AppError(
      503,
      'The AI could not produce a usable response for this article. Please try again.'
    );
  }

  async extractVocabulary(
    text: string,
    language: string,
    difficulty: string
  ): Promise<VocabularyExtractionResult> {
    const prompt = promptTemplates.vocabularyExtraction(text, language, difficulty);
    return this.generateJSON(prompt, vocabularyExtractionSchema, 'extractVocabulary');
  }

  async generateQuestions(
    text: string,
    language: string,
    difficulty: string
  ): Promise<QuestionGenerationResult> {
    const prompt = promptTemplates.questionGeneration(text, language, difficulty);
    return this.generateJSON(prompt, questionGenerationSchema, 'generateQuestions');
  }

  /**
   * Which of these scraped text blocks are the article body.
   *
   * Runs before the four lesson-generation calls and feeds all of them, so it is
   * sequential -- but it is the cheapest call in the pipeline (a few hundred
   * input tokens, a list of integers back) and every later call is spent on
   * whatever it returns.
   */
  async selectArticleBody(blocks: string[]): Promise<ArticleBodyResult> {
    const prompt = promptTemplates.articleBodySelection(blocks);
    return this.generateJSON(prompt, articleBodySchema, 'selectArticleBody');
  }

  async generateVocabQuestions(
    vocabulary: Array<{ word: string; translation: string; explanation: string }>,
    language: string,
    difficulty: string
  ): Promise<VocabQuestionResult> {
    const prompt = promptTemplates.vocabQuestionGeneration(vocabulary, language, difficulty);
    return this.generateJSON(prompt, vocabQuestionSchema, 'generateVocabQuestions');
  }

  async generateWritingPrompts(
    text: string,
    language: string,
    difficulty: string
  ): Promise<WritingPromptResult> {
    const prompt = promptTemplates.writingPromptGeneration(text, language, difficulty);
    return this.generateJSON(prompt, writingPromptSchema, 'generateWritingPrompts');
  }

  async generateFeedback(
    articleText: string,
    shortAnswerQuestions: Array<{ id: string; question: string; expectedAnswerGuidance?: string }>,
    shortAnswerResponses: Array<{ questionId: string; answer: string }>,
    writingPrompts: Array<{ id: string; prompt: string; minWords?: number; maxWords?: number }>,
    writingResponses: Array<{ promptId: string; response: string }>,
    language: string
  ): Promise<FeedbackResult> {
    const prompt = promptTemplates.feedbackGeneration(
      articleText,
      shortAnswerQuestions,
      shortAnswerResponses,
      writingPrompts,
      writingResponses,
      language
    );
    return this.generateJSON(prompt, feedbackSchema, 'generateFeedback');
  }
}

export const llmService = new LLMService();
