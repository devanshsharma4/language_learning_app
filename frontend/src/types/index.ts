export interface User {
  id: string;
  email: string;
  name?: string;
  // Nullable in the database and never set at registration, so every new
  // account starts without one. Callers must supply a fallback.
  preferred_language?: string;
}

export interface Lesson {
  id: string;
  user_id: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  article_title?: string;
  article_text: string;
  article_url?: string;
  vocabulary: VocabularyItem[];
  questions: LessonQuestion[];
  writing_prompts: WritingPrompt[];
  created_at: string;
}

export interface VocabularyItem {
  word: string;
  translation: string;
  explanation: string;
  context: string;
  example?: string;
  partOfSpeech?: string;
}

export interface MCQQuestion {
  id: string;
  type: 'reading_comprehension';
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface VocabMCQQuestion {
  id: string;
  type: 'vocabulary';
  word: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface ShortAnswerQuestion {
  id: string;
  type: 'short_answer';
  question: string;
  expectedAnswerGuidance?: string;
}

export type LessonQuestion = MCQQuestion | VocabMCQQuestion | ShortAnswerQuestion;

export interface WritingPrompt {
  id: string;
  prompt: string;
  minWords?: number;
  maxWords?: number;
}

export interface MCQResult {
  questionId: string;
  type: 'reading_comprehension' | 'vocabulary';
  correct: boolean;
  selectedAnswer: number;
  correctAnswer: number;
}

export interface Feedback {
  mcq_results: MCQResult[];
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

export interface LessonResponse {
  id: string;
  lesson_id: string;
  mcq_answers: Array<{ questionId: string; selectedOption: number }>;
  short_answer_responses: Array<{ questionId: string; answer: string }>;
  writing_responses: Array<{ promptId: string; response: string }>;
  ai_feedback?: Feedback;
  submitted_at: string;
}

export interface SavedVocabulary {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  explanation: string;
  context: string;
}

export interface LessonSummary {
  id: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  article_title?: string;
  article_url?: string;
  created_at: string;
  completed: boolean;
  submitted_at?: string;
  overall_score?: number;
}

export interface Note {
  id: string;
  user_id: string;
  lesson_id: string;
  content: string;
  article_title?: string;
  language?: string;
  difficulty?: string;
  created_at: string;
  updated_at: string;
}
