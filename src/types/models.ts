export interface User {
  id: number;
  email: string;
  password_hash: string;
  name?: string;
  preferred_language?: string;
  created_at: Date;
  updated_at: Date;
}

export interface VocabularyItem {
  word: string;
  translation: string;
  explanation: string;
  example?: string;
  partOfSpeech?: string;
}

export interface MCQQuestion {
  id: string;
  type: 'reading_comprehension';
  question: string;
  options: string[];
  correctAnswer: number; // index into options
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

export interface Lesson {
  id: number;
  user_id: number;
  language: 'spanish' | 'french' | 'japanese' | 'korean';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  article_title?: string;
  article_text: string;
  article_url?: string;
  vocabulary: VocabularyItem[];
  questions: LessonQuestion[];
  writing_prompts: WritingPrompt[];
  created_at: Date;
  updated_at: Date;
}

export interface MCQAnswer {
  questionId: string;
  selectedOption: number; // index into options
}

export interface ShortAnswerResponse {
  questionId: string;
  answer: string;
}

export interface WritingResponse {
  promptId: string;
  response: string;
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
  id: number;
  lesson_id: number;
  user_id: number;
  mcq_answers: MCQAnswer[];
  short_answer_responses: ShortAnswerResponse[];
  writing_responses: WritingResponse[];
  ai_feedback?: Feedback;
  completed: boolean;
  submitted_at: Date;
}

export interface SavedVocabulary {
  id: number;
  user_id: number;
  lesson_id?: number;
  word: string;
  translation?: string;
  explanation?: string;
  context?: string;
  language: string;
  created_at: Date;
}

export interface Note {
  id: number;
  user_id: number;
  lesson_id: number;
  content: string;
  created_at: Date;
  updated_at: Date;
}