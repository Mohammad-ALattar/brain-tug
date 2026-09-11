import { defineBank } from './types.js';
import { entry } from './helpers.js';

export const englishBank = defineBank('english', [
  entry(
    'english.noun-word',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'Which word is a noun?',
      options: [
        { id: 'a', text: 'Quickly' },
        { id: 'b', text: 'Mountain' },
        { id: 'c', text: 'Bright' },
        { id: 'd', text: 'Running' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'أيّ كلمة اسم؟',
      options: [
        { id: 'a', text: 'Quickly' },
        { id: 'b', text: 'Mountain' },
        { id: 'c', text: 'Bright' },
        { id: 'd', text: 'Running' },
      ],
    },
  ),
  entry(
    'english.child-plural',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'What is the plural of "child"?',
      options: [
        { id: 'a', text: 'Childs' },
        { id: 'b', text: 'Childes' },
        { id: 'c', text: 'Children' },
        { id: 'd', text: 'Childrens' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'ما جمع كلمة "child"؟',
      options: [
        { id: 'a', text: 'Childs' },
        { id: 'b', text: 'Childes' },
        { id: 'c', text: 'Children' },
        { id: 'd', text: 'Childrens' },
      ],
    },
  ),
  entry(
    'english.capital-letter',
    {
      difficulty: 'easy',
      type: 'true_false',
      prompt: 'A sentence must always begin with a capital letter.',
      correct: true,
    },
    {
      prompt: 'يجب أن تبدأ الجملة دائمًا بحرف كبير.',
    },
  ),
  entry(
    'english.opposite-ancient',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the opposite of "ancient"?',
      accepted: ['modern', 'new', 'recent'],
    },
    {
      prompt: 'ما عكس كلمة "ancient"؟',
      accepted: ['modern', 'new', 'recent'],
    },
  ),
  entry(
    'english.question-punctuation',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'Which punctuation mark ends a question?',
      accepted: ['question mark', '?'],
    },
    {
      prompt: 'أيّ علامة ترقيم تُنهي السؤال؟',
      accepted: ['علامة استفهام', '؟', 'question mark', '?'],
    },
  ),
  entry(
    'english.apostrophe-correct',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Which sentence uses the apostrophe correctly?',
      options: [
        { id: 'a', text: 'The dog wagged it\u2019s tail.' },
        { id: 'b', text: 'The dogs\u2019 bowls were empty.' },
        { id: 'c', text: 'Three cat\u2019s sat on the wall.' },
        { id: 'd', text: 'Its\u2019 a sunny day.' },
      ],
      correctOptionId: 'b',
      explanation: 'A plural noun ending in s takes the apostrophe after the s.',
    },
    {
      prompt: 'أيّ جملة تستخدم الفاصلة العليا بشكل صحيح؟',
      options: [
        { id: 'a', text: 'The dog wagged it\u2019s tail.' },
        { id: 'b', text: 'The dogs\u2019 bowls were empty.' },
        { id: 'c', text: 'Three cat\u2019s sat on the wall.' },
        { id: 'd', text: 'Its\u2019 a sunny day.' },
      ],
      explanation: 'الاسم الجمع الذي ينتهي بـ s يأتي بعده الفاصلة العليا.',
    },
  ),
  entry(
    'english.personification',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'What figure of speech is "the wind whispered through the trees"?',
      options: [
        { id: 'a', text: 'Simile' },
        { id: 'b', text: 'Personification' },
        { id: 'c', text: 'Hyperbole' },
        { id: 'd', text: 'Alliteration' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'ما نوع التشبيه في "the wind whispered through the trees"؟',
      options: [
        { id: 'a', text: 'Simile' },
        { id: 'b', text: 'Personification' },
        { id: 'c', text: 'Hyperbole' },
        { id: 'd', text: 'Alliteration' },
      ],
    },
  ),
  entry(
    'english.simile-like-as',
    {
      difficulty: 'medium',
      type: 'true_false',
      prompt: 'A simile compares two things using "like" or "as".',
      correct: true,
    },
    {
      prompt: 'التشبيه التمثيلي يقارن بين شيئين باستخدام "like" أو "as".',
    },
  ),
  entry(
    'english.bring-past',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the past tense of "bring"?',
      accepted: ['brought'],
    },
    {
      prompt: 'ما زمن الماضي لكلمة "bring"؟',
      accepted: ['brought'],
    },
  ),
  entry(
    'english.synonym',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What do we call a word that has the same meaning as another?',
      accepted: ['synonym'],
    },
    {
      prompt: 'ماذا نسمّي الكلمة التي لها نفس معنى كلمة أخرى؟',
      accepted: ['synonym', 'مرادف'],
    },
  ),
  entry(
    'english.adverb-beautifully',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'Which word is an adverb in "she sang beautifully at the concert"?',
      options: [
        { id: 'a', text: 'Sang' },
        { id: 'b', text: 'Beautifully' },
        { id: 'c', text: 'Concert' },
        { id: 'd', text: 'She' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'أيّ كلمة حال في "she sang beautifully at the concert"؟',
      options: [
        { id: 'a', text: 'Sang' },
        { id: 'b', text: 'Beautifully' },
        { id: 'c', text: 'Concert' },
        { id: 'd', text: 'She' },
      ],
    },
  ),
  entry(
    'english.shakespeare-romeo',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'Who wrote the play "Romeo and Juliet"?',
      options: [
        { id: 'a', text: 'Charles Dickens' },
        { id: 'b', text: 'Jane Austen' },
        { id: 'c', text: 'William Shakespeare' },
        { id: 'd', text: 'George Orwell' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'من كتب مسرحية "Romeo and Juliet"؟',
      options: [
        { id: 'a', text: 'Charles Dickens' },
        { id: 'b', text: 'Jane Austen' },
        { id: 'c', text: 'William Shakespeare' },
        { id: 'd', text: 'George Orwell' },
      ],
    },
  ),
  entry(
    'english.passive-voice',
    {
      difficulty: 'hard',
      type: 'true_false',
      prompt: 'In the sentence "the cake was eaten by the class", the verb is in the passive voice.',
      correct: true,
    },
    {
      prompt: 'في الجملة "the cake was eaten by the class"، الفعل في صيغة المبني للمجهول.',
    },
  ),
  entry(
    'english.alliteration',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What do we call the repetition of the same starting sound in nearby words?',
      accepted: ['alliteration'],
    },
    {
      prompt: 'ماذا نسمّي تكرار نفس الصوت الأول في كلمات متجاورة؟',
      accepted: ['alliteration', 'جِناس'],
    },
  ),
  entry(
    'english.crows-murder',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the collective noun for a group of crows?',
      accepted: ['murder', 'a murder'],
    },
    {
      prompt: 'ما اسم الجمع لمجموعة من الغربان؟',
      accepted: ['murder', 'a murder'],
    },
  ),
]);
