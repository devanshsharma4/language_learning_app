import type { Lesson } from '../types';

/** Sample lesson backing the /lessons/demo design-preview route. */
export const MOCK_LESSON: Lesson = {
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
