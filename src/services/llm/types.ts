export interface VocabularyExtractionResult {
  vocabulary: Array<{
    word: string;
    translation: string;
    explanation: string;
    partOfSpeech?: string;
    example?: string;
  }>;
}

export interface QuestionGenerationResult {
  readingComprehension: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
  shortAnswer: Array<{
    id: string;
    question: string;
    expectedAnswerGuidance: string;
  }>;
}

export interface VocabQuestionResult {
  questions: Array<{
    id: string;
    word: string;
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
}

export interface WritingPromptResult {
  prompts: Array<{
    id: string;
    prompt: string;
    minWords?: number;
    maxWords?: number;
  }>;
}

export interface FeedbackResult {
  short_answer_evaluation: Array<{
    questionId: string;
    score: number;
    feedback: string;
  }>;
  writing_evaluation: Array<{
    promptId: string;
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }>;
  grammar_corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  vocabulary_suggestions: Array<{
    original: string;
    suggested: string;
    reason: string;
  }>;
  overall_feedback: string;
}
