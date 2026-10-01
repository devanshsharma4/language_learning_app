/** Hard bounds on extracted vocabulary, independent of article length. */
export const VOCAB_MIN = 6;
export const VOCAB_MAX = 20;

/** Roughly one vocabulary word per this many words of article text. */
const WORDS_PER_VOCAB_ITEM = 90;

/**
 * Beginners get MORE glossed words at the same article length, not fewer.
 *
 * This used to run the other way, on the assumption that a beginner is more
 * easily overwhelmed. That had it backwards: the vocabulary list is the help,
 * and a beginner meets more unfamiliar words in the same text than an advanced
 * reader does. Weighting them down left the reader who needed the most support
 * with the least of it, and left genuinely unknown words unmarked and
 * unexplained.
 *
 * An advanced reader wants the opposite — only the words that are actually
 * worth stopping for, since most of the text is already legible to them.
 */
const DIFFICULTY_WEIGHT: Record<string, number> = {
  beginner: 1.2,
  intermediate: 1.0,
  advanced: 0.8,
};

/**
 * How many vocabulary words to request for a given article.
 *
 * A fixed count over-saturates a short article and leaves a long one sparse, so
 * this scales with length, then clamps so the result stays usable at either
 * extreme. The model is asked for this many; `lessonService` enforces the
 * ceiling, since models treat counts as suggestions.
 */
export function vocabularyTarget(text: string, difficulty: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  const weight = DIFFICULTY_WEIGHT[difficulty] ?? 1.0;
  const scaled = Math.round((wordCount / WORDS_PER_VOCAB_ITEM) * weight);

  return Math.min(VOCAB_MAX, Math.max(VOCAB_MIN, scaled));
}

/**
 * What language *questions* are written in, as opposed to the article's language.
 *
 * This used to be unspecified, so the model decided freshly on every call: a
 * single beginner Korean lesson came back with Korean comprehension questions and
 * English vocabulary questions. Whichever behaviour you want, it has to be stated.
 *
 * The choice: beginners get questions in English, because someone who cannot yet
 * read the language cannot read a question written in it either -- the question
 * would test decoding rather than comprehension. Intermediate and advanced
 * learners get questions in the target language, which is the harder and more
 * useful exercise.
 *
 * Writing prompts are deliberately excluded: reading the prompt in the target
 * language is part of that task at every level. See `writingPromptGeneration`.
 */
export function questionLanguage(language: string, difficulty: string): string {
  return difficulty === 'beginner' ? 'English' : language;
}

function questionLanguageRule(language: string, difficulty: string): string {
  const target = questionLanguage(language, difficulty);

  return target === 'English'
    ? `LANGUAGE REQUIREMENT (strict): Write every question and every answer option in ENGLISH, even though the text is in ${language}. This learner is a beginner and cannot yet read ${language} fluently. Only quoted words or phrases taken directly from the text may appear in ${language}.`
    : `LANGUAGE REQUIREMENT (strict): Write every question and every answer option in ${language}, not in English. This learner reads ${language} at a ${difficulty} level.`;
}

/**
 * The same rule for *vocabulary* MCQs, where it has to run the other way round.
 *
 * `questionLanguageRule` puts a beginner's whole question in English, options
 * included. On a comprehension question that is right. On a vocabulary question
 * it destroys the exercise: asked "what does the word for X mean?" in English
 * with four English glosses, the answer is a paraphrase of the question and the
 * target-language word never appears. It tested reading the question.
 *
 * So for beginners the prompt is in English and the four options are the
 * ${language} words themselves — the learner reads a meaning and picks the word
 * that carries it. Intermediate and advanced keep both sides in the target
 * language, which is the same exercise with the support removed.
 */
function vocabQuestionLanguageRule(language: string, difficulty: string): string {
  return questionLanguage(language, difficulty) === 'English'
    ? `LANGUAGE REQUIREMENT (strict): Write every question in ENGLISH — this learner cannot yet read ${language} fluently. But every answer option MUST be a ${language} word, never an English translation. The point of the exercise is to recognise the ${language} word from its meaning, so if the options are in English the question tests nothing.`
    : `LANGUAGE REQUIREMENT (strict): Write every question and every answer option in ${language}, not in English. This learner reads ${language} at a ${difficulty} level.`;
}

/** How much of each block the model needs to judge it. Bounds the input. */
const BLOCK_PREVIEW_LENGTH = 300;

export const promptTemplates = {
  /**
   * Picks the article body out of the text blocks scraped from a page.
   *
   * This exists because structural rules cannot do it. The same tag holds the
   * article on one site and an infobox on another -- lawlessfrench.com lays its
   * article out in a `<table>` and puts its donation plea outside `<article>`,
   * so a rule that drops tables deletes the article and keeps the plea. A model
   * reading the text gets it right because it can tell Provençal abbey prose
   * from "please consider making a donation".
   *
   * The model sees only already-parsed text, never the URL or the raw HTML.
   */
  articleBodySelection: (blocks: string[]) => {
    const listing = blocks
      .map((block, index) => `[${index}] ${block.slice(0, BLOCK_PREVIEW_LENGTH)}`)
      .join('\n');

    return `
      Below are numbered text blocks scraped from a single web page, in the order
      they appeared. Identify which blocks are the BODY of the article itself.

      Exclude anything that is not the article's own prose:
      - navigation, breadcrumbs, "read more" and related-article links
      - image captions and photo credits
      - site instructions and editorial notes addressed to the reader
      - donation appeals, subscription offers, newsletter forms, cookie notices
      - share buttons, clipboard confirmations and other widget text
      - author bylines, timestamps and tag lists standing on their own

      Keep every block of the article's actual prose, including the first and last
      paragraphs. If the whole page is article prose, keep every block. If you are
      unsure about a block, keep it -- dropping real text is worse than leaving a
      stray line in.

      Return ONLY JSON, with the indices in ascending order:
      { "keep": [0, 1, 2] }

      ${listing}
    `;
  },

  vocabularyExtraction: (text: string, language: string, difficulty: string) => `
    You are a language learning assistant. Extract key vocabulary words from the following ${language} text for a ${difficulty} level learner.

    Text: "${text}"

    Select exactly ${vocabularyTarget(text, difficulty)} important vocabulary words that are appropriate for a ${difficulty} learner. Focus on:
    - Words that are essential for understanding the main ideas
    - Words that appear multiple times
    - Words that are slightly above the learner's current level (for growth)
    - Each entry must be a DISTINCT word. Never repeat a word, and do not include
      two forms of the same lemma (e.g. both "oiseau" and "oiseaux").

    For each word, provide:
    - word: The dictionary (base) form — masculine singular for adjectives,
      infinitive for verbs, singular for nouns
    - surfaceForm: The exact substring as it appears in the text, copied
      character for character. If the text uses the base form unchanged, repeat
      it here. This MUST occur verbatim in the text above — it is used to find
      and highlight the word, and an invented form silently fails to match.
    - translation: English translation
    - partOfSpeech: exactly one of: noun, verb, adjective, adverb, other
    - explanation: Brief explanation in simple English (max 20 words)
    - example: A simple example sentence using this word (optional)

    Also provide two headlines for this text, each at most 8 words:
    - title: in ENGLISH, describing what the text is about. This orients a
      learner before they read it in ${language}.
    - titleInLanguage: the same headline written in ${language}. If the text
      already opens with its own headline, use that instead of inventing one.

    Return a JSON object with structure:
    {
      "title": "string",
      "titleInLanguage": "string",
      "vocabulary": [
        {
          "word": "string",
          "surfaceForm": "string",
          "translation": "string",
          "partOfSpeech": "string",
          "explanation": "string",
          "example": "string"
        }
      ]
    }
  `,

  questionGeneration: (text: string, language: string, difficulty: string) => {
    const rcCount = difficulty === 'beginner' ? 3 : difficulty === 'intermediate' ? 4 : 5;
    const saCount = difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3;

    return `
      You are a language learning assistant. Generate questions about the following ${language} text for a ${difficulty} level learner.

      Text: "${text}"

      ${questionLanguageRule(language, difficulty)}

      Generate TWO types of questions:

      1. READING COMPREHENSION (Multiple Choice) - ${rcCount} questions
         - Test understanding of main ideas, details, and inferences
         - Each question has exactly 4 options (A, B, C, D)
         - Only one option is correct
         - Options should be plausible but clearly distinguishable
         - Progress from easier to harder
         - Use IDs: "rc1", "rc2", etc.

      2. SHORT ANSWER - ${saCount} question(s)
         - Ask the question in ${questionLanguage(language, difficulty)}, but the learner
           writes their answer in ${language}. State that in the question if unclear.
         - Test deeper comprehension, analysis, or personal reflection on the text
         - Appropriate for ${difficulty} level
         - Include guidance on what a good answer should cover
         - Use IDs: "sa1", "sa2", etc.

      Return a JSON object with structure:
      {
        "readingComprehension": [
          {
            "id": "rc1",
            "question": "string",
            "options": ["option A", "option B", "option C", "option D"],
            "correctAnswer": 0
          }
        ],
        "shortAnswer": [
          {
            "id": "sa1",
            "question": "string",
            "expectedAnswerGuidance": "string (brief guide for what a good answer should include)"
          }
        ]
      }
    `;
  },

  vocabQuestionGeneration: (
    vocabularyWords: Array<{ word: string; translation: string; explanation: string }>,
    language: string,
    difficulty: string
  ) => {
    const count = difficulty === 'beginner' ? 4 : 5;
    const beginner = questionLanguage(language, difficulty) === 'English';
    const wordList = vocabularyWords
      .map(v => `- ${v.word} (${v.translation}): ${v.explanation}`)
      .join('\n');

    // Both shapes ask the learner to go from meaning to word. The beginner form
    // states the meaning in English; the other states it in the target language.
    const questionShape = beginner
      ? `- Each question gives the MEANING in English and asks which ${language} word carries it,
        e.g. "Which word means 'to invent or discover something new'?"
      - Alternatively, give an English sentence with a blank where the ${language} word belongs
      - All 4 options are ${language} words. Use the word being tested as the correct option and
        three OTHER words from the list above as distractors. Never put an English gloss in an option.`
      : `- Each question states the MEANING in ${language} and asks which word carries it,
        or gives a ${language} sentence with a blank where the word belongs
      - All 4 options are ${language} words — never definitions, and never English. An option
        that restates the question is not a test: if the question asks "which word means the art
        of making films", the options must be words, not "the art of making films".`;

    return `
      You are a language learning assistant. Generate ${count} multiple-choice vocabulary questions to test a ${difficulty} level learner's understanding of these ${language} words.

      Vocabulary words:
      ${wordList}

      ${vocabQuestionLanguageRule(language, difficulty)}

      Select ${count} words from the list above and create one question per word. For each question:
      ${questionShape}
      - Provide exactly 4 options
      - Do NOT name the word being tested in the question text itself; the "word" field
        records it separately. A question that contains its own answer tests nothing.
      - Make distractor options plausible (related words, similar meanings, common confusions)
      - Only one option should be correct
      - Use IDs: "vq1", "vq2", etc.

      Return a JSON object with structure:
      {
        "questions": [
          {
            "id": "vq1",
            "word": "the vocabulary word being tested",
            "question": "string",
            "options": ["option A", "option B", "option C", "option D"],
            "correctAnswer": 0
          }
        ]
      }
    `;
  },

  writingPromptGeneration: (text: string, language: string, difficulty: string) => {
    const promptCount = difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3;
    const wordCounts = {
      beginner: { min: 20, max: 50 },
      intermediate: { min: 50, max: 100 },
      advanced: { min: 100, max: 200 }
    };

    return `
      Generate ${promptCount} writing prompt(s) related to the following ${language} text for a ${difficulty} level learner.

      Text: "${text}"

      LANGUAGE REQUIREMENT (strict): Write the prompt itself in ${language}, at every
      difficulty level including beginner, and the learner responds in ${language}.
      Reading the prompt is part of this exercise -- unlike the comprehension and
      vocabulary questions, which are in English for beginners. Keep the wording
      simple enough for a ${difficulty} learner to parse.

      Create prompts that:
      - Relate directly to the article's topic
      - Encourage use of vocabulary from the text
      - Are achievable for ${difficulty} learners
      - Progress in difficulty if multiple prompts

      Word count expectations (include BOTH minWords and maxWords on every prompt):
      - Minimum: ${wordCounts[difficulty as keyof typeof wordCounts].min} words
      - Maximum: ${wordCounts[difficulty as keyof typeof wordCounts].max} words

      Return a JSON object with structure:
      {
        "prompts": [
          {
            "id": "p1",
            "prompt": "string",
            "minWords": number,
            "maxWords": number
          }
        ]
      }
    `;
  },

  feedbackGeneration: (
    articleText: string,
    shortAnswerQuestions: Array<{ id: string; question: string; expectedAnswerGuidance?: string }>,
    shortAnswerResponses: Array<{ questionId: string; answer: string }>,
    writingPrompts: Array<{ id: string; prompt: string; minWords?: number; maxWords?: number }>,
    writingResponses: Array<{ promptId: string; response: string }>,
    language: string
  ) => `
    You are a helpful language teacher providing feedback on a student's ${language} lesson responses.

    Original Article: "${articleText}"

    Short Answer Questions and Student Answers:
    ${shortAnswerQuestions.map((q) => {
      const response = shortAnswerResponses.find((r) => r.questionId === q.id);
      return `
        questionId: ${q.id}
        Question: ${q.question}
        Expected Guidance: ${q.expectedAnswerGuidance || ''}
        Student's Answer: ${response?.answer || 'No answer provided'}
      `;
    }).join('\n')}

    Writing Prompts and Student Responses:
    ${writingPrompts.map((p) => {
      const response = writingResponses.find((r) => r.promptId === p.id);
      return `
        promptId: ${p.id}
        Prompt: ${p.prompt}
        Word Limit: ${p.minWords}-${p.maxWords} words
        Student's Response: ${response?.response || 'No response provided'}
      `;
    }).join('\n')}

    ID REQUIREMENT (strict): copy the questionId and promptId values above
    verbatim into your response, one evaluation per question and per prompt, in
    the same order. They are how each piece of feedback is matched back to the
    question it is about. Do not invent ids such as "question_1".

    Provide constructive feedback that:
    - Evaluates each short answer for comprehension accuracy (score 0-10)
    - Identifies grammar errors with corrections and explanations
    - Suggests better vocabulary choices where appropriate
    - Assesses writing quality with specific strengths and areas for improvement
    - Is encouraging and supportive
    - Uses simple English explanations

    Return a JSON object with structure:
    {
      "short_answer_evaluation": [
        {
          "questionId": "string",
          "score": number (integer 0-10, where 10 is a complete and accurate answer),
          "feedback": "string"
        }
      ],
      "writing_evaluation": [
        {
          "promptId": "string",
          "score": number (integer 0-10, where 10 is excellent for this difficulty level),
          "feedback": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        }
      ],
      "grammar_corrections": [
        {
          "original": "string",
          "corrected": "string",
          "explanation": "string"
        }
      ],
      "vocabulary_suggestions": [
        {
          "original": "string",
          "suggested": "string",
          "reason": "string"
        }
      ],
      "overall_feedback": "string (2-3 sentences of encouragement and key takeaways)"
    }
  `
};
