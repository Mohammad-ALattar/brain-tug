import { defineBank } from './types.js';
import { entry } from './helpers.js';

export const generalBank = defineBank('general', [
  entry(
    'general.leap-year',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'How many days are there in a leap year?',
      options: [
        { id: 'a', text: '364' },
        { id: 'b', text: '365' },
        { id: 'c', text: '366' },
        { id: 'd', text: '367' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'كم عدد الأيام في السنة الكبيسة؟',
      options: [
        { id: 'a', text: '364' },
        { id: 'b', text: '365' },
        { id: 'c', text: '366' },
        { id: 'd', text: '367' },
      ],
    },
  ),
  entry(
    'general.blue-yellow',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'Which colour do you get by mixing blue and yellow?',
      options: [
        { id: 'a', text: 'Green' },
        { id: 'b', text: 'Purple' },
        { id: 'c', text: 'Orange' },
        { id: 'd', text: 'Brown' },
      ],
      correctOptionId: 'a',
    },
    {
      prompt: 'أيّ لون تحصل عليه عند مزج الأزرق والأصفر؟',
      options: [
        { id: 'a', text: 'الأخضر' },
        { id: 'b', text: 'البنفسجي' },
        { id: 'c', text: 'البرتقالي' },
        { id: 'd', text: 'البني' },
      ],
    },
  ),
  entry(
    'general.triangle-sides',
    {
      difficulty: 'easy',
      type: 'true_false',
      prompt: 'A triangle has three sides.',
      correct: true,
    },
    {
      prompt: 'المثلث له ثلاثة أضلاع.',
    },
  ),
  entry(
    'general.hour-minutes',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'How many minutes are there in an hour?',
      accepted: ['60'],
    },
    {
      prompt: 'كم عدد الدقائق في الساعة؟',
    },
  ),
  entry(
    'general.cat-kitten',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the young of a cat called?',
      accepted: ['kitten', 'a kitten'],
    },
    {
      prompt: 'ماذا يُسمى صغير القطة؟',
      accepted: ['قط', 'قطة صغيرة', 'هرة صغيرة'],
    },
  ),
  entry(
    'general.football-players',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'How many players are there in a football (soccer) team on the pitch?',
      options: [
        { id: 'a', text: '9' },
        { id: 'b', text: '10' },
        { id: 'c', text: '11' },
        { id: 'd', text: '12' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'كم عدد اللاعبين في فريق كرة القدم على أرض الملعب؟',
      options: [
        { id: 'a', text: '9' },
        { id: 'b', text: '10' },
        { id: 'c', text: '11' },
        { id: 'd', text: '12' },
      ],
    },
  ),
  entry(
    'general.piano-keys',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Which instrument has 88 keys?',
      options: [
        { id: 'a', text: 'Guitar' },
        { id: 'b', text: 'Piano' },
        { id: 'c', text: 'Violin' },
        { id: 'd', text: 'Flute' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'أيّ آلة موسيقية لها 88 مفتاحًا؟',
      options: [
        { id: 'a', text: 'الجيتار' },
        { id: 'b', text: 'البيانو' },
        { id: 'c', text: 'الكمان' },
        { id: 'd', text: 'الفلوت' },
      ],
    },
  ),
  entry(
    'general.olympics-four-years',
    {
      difficulty: 'medium',
      type: 'true_false',
      prompt: 'The Olympic Games are held every four years.',
      correct: true,
    },
    {
      prompt: 'تُقام الألعاب الأولمبية كل أربع سنوات.',
    },
  ),
  entry(
    'general.hexagon-sides',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'How many sides does a hexagon have?',
      accepted: ['6'],
    },
    {
      prompt: 'كم عدد أضلاع الشكل السداسي؟',
    },
  ),
  entry(
    'general.largest-land-animal',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the largest land animal alive today?',
      accepted: ['elephant', 'african elephant', 'the elephant'],
    },
    {
      prompt: 'ما أكبر حيوان بريّ حيّ اليوم؟',
      accepted: ['الفيل', 'فيل', 'الفيل الأفريقي'],
    },
  ),
  entry(
    'general.violin-strings',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'How many strings does a standard violin have?',
      options: [
        { id: 'a', text: '4' },
        { id: 'b', text: '5' },
        { id: 'c', text: '6' },
        { id: 'd', text: '7' },
      ],
      correctOptionId: 'a',
    },
    {
      prompt: 'كم عدد أوتار الكمان العادي؟',
      options: [
        { id: 'a', text: '4' },
        { id: 'b', text: '5' },
        { id: 'c', text: '6' },
        { id: 'd', text: '7' },
      ],
    },
  ),
  entry(
    'general.primary-light-colour',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'Which of these is a primary colour of light?',
      options: [
        { id: 'a', text: 'Yellow' },
        { id: 'b', text: 'Green' },
        { id: 'c', text: 'Orange' },
        { id: 'd', text: 'Purple' },
      ],
      correctOptionId: 'b',
      explanation: 'Light mixes from red, green and blue; paint mixes from red, yellow and blue.',
    },
    {
      prompt: 'أيّ من هذه الألوان لون أساسي للضوء؟',
      options: [
        { id: 'a', text: 'الأصفر' },
        { id: 'b', text: 'الأخضر' },
        { id: 'c', text: 'البرتقالي' },
        { id: 'd', text: 'البنفسجي' },
      ],
      explanation: 'الضوء يُمزج من الأحمر والأخضر والأزرق؛ والألوان تُمزج من الأحمر والأصفر والأزرق.',
    },
  ),
  entry(
    'general.century-years',
    {
      difficulty: 'hard',
      type: 'true_false',
      prompt: 'A century is one hundred years.',
      correct: true,
    },
    {
      prompt: 'القرن مئة سنة.',
    },
  ),
  entry(
    'general.full-turn-degrees',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'How many degrees are there in a full turn?',
      accepted: ['360'],
    },
    {
      prompt: 'كم عدد الدرجات في الدورة الكاملة؟',
    },
  ),
  entry(
    'general.japan-currency',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the currency of Japan?',
      accepted: ['yen', 'japanese yen', 'the yen'],
    },
    {
      prompt: 'ما عملة اليابان؟',
      accepted: ['الين', 'ين الياباني', 'ين'],
    },
  ),
]);
