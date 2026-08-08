import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import {
  VocabularyExtractionResult,
  QuestionGenerationResult,
  VocabQuestionResult,
  WritingPromptResult,
  FeedbackResult
} from './types';
import { promptTemplates } from './prompts';

class LLMService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY
    });
  }

  private async generateCompletion(prompt: string, temperature = 0.7): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    return '';
  }

  private async generateJSON<T>(prompt: string): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown formatting or explanations.`;
    const response = await this.generateCompletion(jsonPrompt, 0.3);

    try {
      return JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim());
    } catch (error) {
      console.error('Failed to parse JSON response:', response);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  async extractVocabulary(
    text: string,
    language: string,
    difficulty: string
  ): Promise<VocabularyExtractionResult> {
    const prompt = promptTemplates.vocabularyExtraction(text, language, difficulty);
    return this.generateJSON<VocabularyExtractionResult>(prompt);
  }

  async generateQuestions(
    text: string,
    language: string,
    difficulty: string
  ): Promise<QuestionGenerationResult> {
    const prompt = promptTemplates.questionGeneration(text, language, difficulty);
    return this.generateJSON<QuestionGenerationResult>(prompt);
  }

  async generateVocabQuestions(
    vocabulary: Array<{ word: string; translation: string; explanation: string }>,
    language: string,
    difficulty: string
  ): Promise<VocabQuestionResult> {
    const prompt = promptTemplates.vocabQuestionGeneration(vocabulary, language, difficulty);
    return this.generateJSON<VocabQuestionResult>(prompt);
  }

  async generateWritingPrompts(
    text: string,
    language: string,
    difficulty: string
  ): Promise<WritingPromptResult> {
    const prompt = promptTemplates.writingPromptGeneration(text, language, difficulty);
    return this.generateJSON<WritingPromptResult>(prompt);
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
    return this.generateJSON<FeedbackResult>(prompt);
  }

  async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    const prompt = `Translate the following ${fromLang} text to ${toLang}. Provide only the translation, no explanations:\n\n${text}`;
    return this.generateCompletion(prompt);
  }
}

export const llmService = new LLMService();
