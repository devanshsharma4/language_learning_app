export const promptTemplates = {
  vocabularyExtraction: (text: string, language: string, difficulty: string) => `
    You are a language learning assistant. Extract key vocabulary words from the following ${language} text for a ${difficulty} level learner.

    Text: "${text}"

    Select 10-15 important vocabulary words that are appropriate for a ${difficulty} learner. Focus on:
    - Words that are essential for understanding the main ideas
    - Words that appear multiple times
    - Words that are slightly above the learner's current level (for growth)

    For each word, provide:
    - word: The word as it appears in the text
    - translation: English translation
    - partOfSpeech: noun, verb, adjective, adverb, etc.
    - explanation: Brief explanation in simple English (max 20 words)
    - example: A simple example sentence using this word (optional)

    Return a JSON object with structure:
    {
      "vocabulary": [
        {
          "word": "string",
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

      Generate TWO types of questions:

      1. READING COMPREHENSION (Multiple Choice) - ${rcCount} questions
         - Test understanding of main ideas, details, and inferences
         - Each question has exactly 4 options (A, B, C, D)
         - Only one option is correct
         - Options should be plausible but clearly distinguishable
         - Progress from easier to harder
         - Use IDs: "rc1", "rc2", etc.

      2. SHORT ANSWER - ${saCount} question(s)
         - Open-ended questions requiring a written response in ${language}
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
    const wordList = vocabularyWords
      .map(v => `- ${v.word} (${v.translation}): ${v.explanation}`)
      .join('\n');

    return `
      You are a language learning assistant. Generate ${count} multiple-choice vocabulary questions to test a ${difficulty} level learner's understanding of these ${language} words.

      Vocabulary words:
      ${wordList}

      Select ${count} words from the list above and create one question per word. For each question:
      - Ask what the word means in context, or present a sentence with a blank for the word
      - Provide exactly 4 options
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

      Create prompts that:
      - Relate directly to the article's topic
      - Encourage use of vocabulary from the text
      - Are achievable for ${difficulty} learners
      - Progress in difficulty if multiple prompts

      Word count expectations:
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
        Question: ${q.question}
        Expected Guidance: ${q.expectedAnswerGuidance || ''}
        Student's Answer: ${response?.answer || 'No answer provided'}
      `;
    }).join('\n')}

    Writing Prompts and Student Responses:
    ${writingPrompts.map((p) => {
      const response = writingResponses.find((r) => r.promptId === p.id);
      return `
        Prompt: ${p.prompt}
        Word Limit: ${p.minWords}-${p.maxWords} words
        Student's Response: ${response?.response || 'No response provided'}
      `;
    }).join('\n')}

    Provide constructive feedback that:
    - Evaluates each short answer for comprehension accuracy (score 0-100)
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
          "score": number (0-100),
          "feedback": "string"
        }
      ],
      "writing_evaluation": [
        {
          "promptId": "string",
          "score": number (0-100),
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
