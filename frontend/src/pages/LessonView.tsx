import { useReducer, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import type { Lesson, LessonResponse } from '../types';
import LessonHeader from '../components/lesson/LessonHeader';
import ArticleSection from '../components/lesson/ArticleSection';
import QuestionsSection from '../components/lesson/QuestionsSection';
import WritingPromptsSection from '../components/lesson/WritingPromptsSection';

interface FormState {
  mcqAnswers: Record<string, number>;
  shortAnswers: Record<string, string>;
  writingResponses: Record<string, string>;
}

type Action =
  | { type: 'SET_MCQ'; questionId: string; optionIndex: number }
  | { type: 'SET_SHORT_ANSWER'; questionId: string; value: string }
  | { type: 'SET_WRITING'; promptId: string; value: string };

function formReducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SET_MCQ':
      return {
        ...state,
        mcqAnswers: {
          ...state.mcqAnswers,
          [action.questionId]: action.optionIndex,
        },
      };
    case 'SET_SHORT_ANSWER':
      return {
        ...state,
        shortAnswers: {
          ...state.shortAnswers,
          [action.questionId]: action.value,
        },
      };
    case 'SET_WRITING':
      return {
        ...state,
        writingResponses: {
          ...state.writingResponses,
          [action.promptId]: action.value,
        },
      };
  }
}

// TODO: Remove mock data after testing — used for design preview
const MOCK_LESSON: Lesson = {
  id: 'demo',
  user_id: '1',
  language: 'french',
  difficulty: 'intermediate',
  article_title: 'La vie dans les villes du futur',
  article_text: `Les villes du futur promettent d'etre des lieux fascinants ou la technologie et la nature cohabitent en harmonie. Les batiments intelligents regulent leur propre consommation d'energie, tandis que les jardins verticaux recouvrent les facades, purifiant l'air et fournissant des aliments frais aux habitants.

Les transports en commun seront entierement electriques et autonomes. Les citoyens pourront se deplacer sans se soucier de la circulation, car des systemes avances d'intelligence artificielle gereront le flux de vehicules. Les velos et les espaces pietons auront la priorite sur les automobiles.

La durabilite sera le pilier fondamental de ces villes. Chaque batiment produira sa propre energie grace a des panneaux solaires et des eoliennes integrees dans sa structure. L'eau de pluie sera collectee et recyclee, reduisant considerablement le gaspillage des ressources naturelles.

Les espaces communautaires favoriseront l'interaction sociale. Bibliotheques, jardins urbains et centres culturels seront a la portee de tous, creant un sentiment de communaute qui se perd souvent dans les grandes metropoles actuelles.`,
  article_url: undefined,
  vocabulary: [
    { word: 'cohabitent', translation: 'coexist', explanation: 'To live or exist together in the same place or time', partOfSpeech: 'verbe', context: '', example: 'La technologie et la nature cohabitent en harmonie.' },
    { word: 'facades', translation: 'facades', explanation: 'The front face or exterior wall of a building', partOfSpeech: 'nom', context: '', example: 'Les jardins verticaux recouvrent les facades.' },
    { word: 'durabilite', translation: 'sustainability', explanation: 'The ability to maintain ecological balance without depleting natural resources', partOfSpeech: 'nom', context: '', example: 'La durabilite sera le pilier fondamental.' },
    { word: 'se deplacer', translation: 'to get around / commute', explanation: 'To move or travel from one place to another', partOfSpeech: 'verbe', context: '', example: 'Les citoyens pourront se deplacer sans se soucier.' },
    { word: 'gaspillage', translation: 'waste', explanation: 'The careless or excessive use of something valuable', partOfSpeech: 'nom', context: '', example: 'Reduisant considerablement le gaspillage des ressources.' },
    { word: 'favoriseront', translation: 'will encourage / foster', explanation: 'To promote or encourage the development of something', partOfSpeech: 'verbe', context: '', example: "Les espaces communautaires favoriseront l'interaction sociale." },
    { word: 'a la portee', translation: 'within reach / accessible', explanation: "Available or obtainable; within one's ability to access", partOfSpeech: 'expression', context: '', example: 'Seront a la portee de tous.' },
  ],
  questions: [
    {
      id: 'rc1',
      type: 'reading_comprehension',
      question: 'What role do vertical gardens play in the cities of the future?',
      options: [
        'They are purely decorative additions to buildings',
        'They purify the air and provide fresh food to residents',
        'They replace traditional parks entirely',
        'They generate electricity for the buildings',
      ],
      correctAnswer: 1,
    },
    {
      id: 'rc2',
      type: 'reading_comprehension',
      question: 'How will public transportation change in future cities?',
      options: [
        'It will be powered by fossil fuels but more efficient',
        'Private cars will be completely banned',
        'It will be fully electric and autonomous',
        'Only bicycles will be allowed',
      ],
      correctAnswer: 2,
    },
    {
      id: 'rc3',
      type: 'reading_comprehension',
      question: 'What is described as the fundamental pillar of these future cities?',
      options: [
        'Technology and artificial intelligence',
        'Community spaces and social interaction',
        'Sustainability',
        'Economic growth and development',
      ],
      correctAnswer: 2,
    },
    {
      id: 'rc4',
      type: 'reading_comprehension',
      question: 'What problem do community spaces address according to the article?',
      options: [
        'The lack of commercial centers in cities',
        'The loss of community feeling in large modern cities',
        'The need for more government buildings',
        'The shortage of housing in urban areas',
      ],
      correctAnswer: 1,
    },
    {
      id: 'vq1',
      type: 'vocabulary',
      word: 'cohabitent',
      question: 'What does "cohabitent" mean in the context of the article?',
      options: [
        'Compete against each other',
        'Coexist together',
        'Communicate frequently',
        'Collapse simultaneously',
      ],
      correctAnswer: 1,
    },
    {
      id: 'vq2',
      type: 'vocabulary',
      word: 'durabilite',
      question: 'The article mentions "durabilite" as a fundamental pillar. What does it mean?',
      options: [
        'Durability of materials',
        'Economic stability',
        'Sustainability',
        'Digital security',
      ],
      correctAnswer: 2,
    },
    {
      id: 'vq3',
      type: 'vocabulary',
      word: 'gaspillage',
      question: 'What does "gaspillage" refer to in the article?',
      options: [
        'Gasoline usage',
        'Waste or squandering of resources',
        'Gathering of materials',
        'Gardening practices',
      ],
      correctAnswer: 1,
    },
    {
      id: 'vq4',
      type: 'vocabulary',
      word: 'favoriseront',
      question: 'What does "favoriseront" mean in "Les espaces communautaires favoriseront l\'interaction sociale"?',
      options: [
        'Will prevent',
        'Will favor / encourage',
        'Will finalize',
        'Will abandon',
      ],
      correctAnswer: 1,
    },
    {
      id: 'sa1',
      type: 'short_answer',
      question: 'In your own words, explain how the article envisions the relationship between technology and nature in future cities. Do you think this vision is realistic?',
      expectedAnswerGuidance: 'Should mention coexistence/harmony, smart buildings, vertical gardens, and provide personal opinion with reasoning.',
    },
    {
      id: 'sa2',
      type: 'short_answer',
      question: 'What changes would you most like to see in your own city based on the ideas in the article?',
      expectedAnswerGuidance: 'Should reference specific ideas from the article and connect them to personal experience.',
    },
  ],
  writing_prompts: [
    { id: 'w1', prompt: "Decrivez votre ville ideale du futur. Quelles caracteristiques aurait-elle, et comment la vie quotidienne serait-elle differente d'aujourd'hui?", minWords: 50, maxWords: 100 },
    { id: 'w2', prompt: 'Pensez-vous que la technologie peut vraiment aider les villes a devenir plus durables? Expliquez votre raisonnement avec des exemples.', minWords: 50, maxWords: 100 },
  ],
  created_at: new Date().toISOString(),
};

export default function LessonView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formState, dispatch] = useReducer(formReducer, {
    mcqAnswers: {},
    shortAnswers: {},
    writingResponses: {},
  });

  const isDemo = id === 'demo';

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useQuery<{ lesson: Lesson; response?: LessonResponse }>({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const { data } = await api.get(`/lessons/${id}`);
      const payload = data.data ?? data;
      return {
        lesson: payload.lesson ?? payload,
        response: payload.response,
      };
    },
    enabled: !!id && !isDemo,
  });

  const lesson = isDemo ? MOCK_LESSON : fetchedData?.lesson;

  // Redirect to results if lesson already has a submitted response with feedback
  useEffect(() => {
    if (fetchedData?.response?.ai_feedback && id) {
      navigate(`/lessons/${id}/results`, {
        replace: true,
        state: { lesson: fetchedData.lesson, response: fetchedData.response },
      });
    }
  }, [fetchedData, id, navigate]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const mcqAnswers = Object.entries(formState.mcqAnswers).map(
        ([questionId, selectedOption]) => ({ questionId, selectedOption })
      );
      const shortAnswerResponses = Object.entries(formState.shortAnswers).map(
        ([questionId, answer]) => ({ questionId, answer })
      );
      const writingResponses = Object.entries(formState.writingResponses).map(
        ([promptId, response]) => ({ promptId, response })
      );

      const { data } = await api.post(`/lessons/${id}/submit`, {
        mcqAnswers,
        shortAnswerResponses,
        writingResponses,
      });
      return data;
    },
    onSuccess: (data) => {
      const response: LessonResponse = data.data?.response ?? data.response ?? data;
      navigate(`/lessons/${id}/results`, {
        state: { lesson, response },
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream font-body flex items-center justify-center">
        <div className="flex items-center gap-3 text-bark-light">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading lesson...
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-cream font-body flex items-center justify-center">
        <div className="text-center">
          <p className="text-bark-light mb-4">Failed to load lesson.</p>
          <a
            href="/dashboard"
            className="text-sage-dark hover:text-olive transition-colors duration-200"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-cream font-body overflow-hidden">
      {/* Soft grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        <LessonHeader language={lesson.language} difficulty={lesson.difficulty} />

        {/* Article */}
        <ArticleSection
          title={lesson.article_title}
          articleText={lesson.article_text}
          vocabulary={lesson.vocabulary}
          language={lesson.language}
          lessonId={id}
        />

        {/* Divider */}
        <div className="flex items-center gap-3 my-12">
          <span className="flex-1 h-px bg-sand" />
          <div className="text-sage">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.5" />
              <path d="M9 12H4" />
            </svg>
          </div>
          <span className="flex-1 h-px bg-sand" />
        </div>

        {/* Questions */}
        {lesson.questions.length > 0 && (
          <QuestionsSection
            questions={lesson.questions}
            mcqAnswers={formState.mcqAnswers}
            shortAnswers={formState.shortAnswers}
            onMCQChange={(qId, optIdx) =>
              dispatch({ type: 'SET_MCQ', questionId: qId, optionIndex: optIdx })
            }
            onShortAnswerChange={(qId, val) =>
              dispatch({ type: 'SET_SHORT_ANSWER', questionId: qId, value: val })
            }
          />
        )}

        {/* Writing Prompts */}
        {lesson.writing_prompts.length > 0 && (
          <>
            <div className="flex items-center gap-3 my-12">
              <span className="flex-1 h-px bg-sand" />
              <span className="text-sm text-bark-light/50 font-medium tracking-wide uppercase">
                Writing
              </span>
              <span className="flex-1 h-px bg-sand" />
            </div>

            <WritingPromptsSection
              prompts={lesson.writing_prompts}
              responses={formState.writingResponses}
              onResponseChange={(pId, val) =>
                dispatch({ type: 'SET_WRITING', promptId: pId, value: val })
              }
            />
          </>
        )}

        {/* Submit */}
        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          className="w-full mt-10 mb-8 py-4 bg-sage hover:bg-sage-dark active:bg-olive text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-lg cursor-pointer"
        >
          {submitMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Answers'
          )}
        </button>

        {submitMutation.isError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center mb-8">
            Something went wrong. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
