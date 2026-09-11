import { defineBank } from './types.js';
import { entry } from './helpers.js';

export const geographyBank = defineBank('geography', [
  entry(
    'geography.largest-ocean',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'Which is the largest ocean on Earth?',
      options: [
        { id: 'a', text: 'Atlantic' },
        { id: 'b', text: 'Indian' },
        { id: 'c', text: 'Pacific' },
        { id: 'd', text: 'Arctic' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'ما أكبر محيط على الأرض؟',
      options: [
        { id: 'a', text: 'الأطلسي' },
        { id: 'b', text: 'الهندي' },
        { id: 'c', text: 'الهادئ' },
        { id: 'd', text: 'المتجمد الشمالي' },
      ],
    },
  ),
  entry(
    'geography.france-capital',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'What is the capital city of France?',
      options: [
        { id: 'a', text: 'Lyon' },
        { id: 'b', text: 'Paris' },
        { id: 'c', text: 'Marseille' },
        { id: 'd', text: 'Bordeaux' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'ما عاصمة فرنسا؟',
      options: [
        { id: 'a', text: 'ليون' },
        { id: 'b', text: 'باريس' },
        { id: 'c', text: 'مرسيليا' },
        { id: 'd', text: 'بوردو' },
      ],
    },
  ),
  entry(
    'geography.australia-country-continent',
    {
      difficulty: 'easy',
      type: 'true_false',
      prompt: 'Australia is both a country and a continent.',
      correct: true,
    },
    {
      prompt: 'أستراليا بلد وقارة في آن واحد.',
    },
  ),
  entry(
    'geography.continent-count',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'How many continents are there on Earth?',
      accepted: ['7'],
    },
    {
      prompt: 'كم عدد القارات على الأرض؟',
    },
  ),
  entry(
    'geography.desert',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What do we call a very dry region that gets almost no rain?',
      accepted: ['desert', 'a desert'],
    },
    {
      prompt: 'ماذا نسمّي المنطقة الجافة جدًا التي لا تتلقى أمطارًا تقريبًا؟',
      accepted: ['صحراء', 'الصحراء'],
    },
  ),
  entry(
    'geography.urals-europe-asia',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Which mountain range separates Europe from Asia?',
      options: [
        { id: 'a', text: 'The Alps' },
        { id: 'b', text: 'The Andes' },
        { id: 'c', text: 'The Urals' },
        { id: 'd', text: 'The Himalayas' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'أيّ سلسلة جبال تفصل أوروبا عن آسيا؟',
      options: [
        { id: 'a', text: 'الألب' },
        { id: 'b', text: 'الأنديز' },
        { id: 'c', text: 'الأورال' },
        { id: 'd', text: 'الهيمالايا' },
      ],
    },
  ),
  entry(
    'geography.largest-population',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Which country has the largest population in the world?',
      options: [
        { id: 'a', text: 'China' },
        { id: 'b', text: 'India' },
        { id: 'c', text: 'United States' },
        { id: 'd', text: 'Indonesia' },
      ],
      correctOptionId: 'b',
      explanation: 'India passed China in 2023 and remains the most populous country.',
    },
    {
      prompt: 'أيّ بلد له أكبر عدد سكان في العالم؟',
      options: [
        { id: 'a', text: 'الصين' },
        { id: 'b', text: 'الهند' },
        { id: 'c', text: 'الولايات المتحدة' },
        { id: 'd', text: 'إندونيسيا' },
      ],
      explanation: 'تجاوزت الهند الصين عام 2023 وتظل البلد الأكثر سكانًا.',
    },
  ),
  entry(
    'geography.equator-brazil',
    {
      difficulty: 'medium',
      type: 'true_false',
      prompt: 'The Equator passes through Brazil.',
      correct: true,
    },
    {
      prompt: 'يمرّ خط الاستواء عبر البرازيل.',
    },
  ),
  entry(
    'geography.africa-longest-river',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the longest river in Africa?',
      accepted: ['nile', 'the nile', 'river nile'],
    },
    {
      prompt: 'ما أطول نهر في أفريقيا؟',
      accepted: ['النيل', 'نيل', 'نهر النيل'],
    },
  ),
  entry(
    'geography.sahara-desert',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'Which desert covers most of northern Africa?',
      accepted: ['sahara', 'the sahara'],
    },
    {
      prompt: 'أيّ صحراء تغطّي معظم شمال أفريقيا؟',
      accepted: ['الصحراء الكبرى', 'الصحراء', 'صحراء'],
    },
  ),
  entry(
    'geography.mariana-trench',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'Which is the deepest point in the world\u2019s oceans?',
      options: [
        { id: 'a', text: 'The Mariana Trench' },
        { id: 'b', text: 'The Puerto Rico Trench' },
        { id: 'c', text: 'The Java Trench' },
        { id: 'd', text: 'The Tonga Trench' },
      ],
      correctOptionId: 'a',
    },
    {
      prompt: 'ما أعمق نقطة في محيطات العالم؟',
      options: [
        { id: 'a', text: 'خندق ماريانا' },
        { id: 'b', text: 'خندق بورتوريكو' },
        { id: 'c', text: 'خندق جاوة' },
        { id: 'd', text: 'خندق تونغا' },
      ],
    },
  ),
  entry(
    'geography.canada-capital',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'What is the capital of Canada?',
      options: [
        { id: 'a', text: 'Toronto' },
        { id: 'b', text: 'Vancouver' },
        { id: 'c', text: 'Montreal' },
        { id: 'd', text: 'Ottawa' },
      ],
      correctOptionId: 'd',
    },
    {
      prompt: 'ما عاصمة كندا؟',
      options: [
        { id: 'a', text: 'تورونتو' },
        { id: 'b', text: 'فانكوفر' },
        { id: 'c', text: 'مونتريال' },
        { id: 'd', text: 'أوتاوا' },
      ],
    },
  ),
  entry(
    'geography.longitude-direction',
    {
      difficulty: 'hard',
      type: 'true_false',
      prompt: 'Lines of longitude run east to west around the globe.',
      correct: false,
      explanation: 'Longitude runs north to south; latitude runs east to west.',
    },
    {
      prompt: 'خطوط الطول تمتد من الشرق إلى الغرب حول الكرة الأرضية.',
      explanation: 'خطوط الطول تمتد من الشمال إلى الجنوب؛ وخطوط العرض من الشرق إلى الغرب.',
    },
  ),
  entry(
    'geography.machu-picchu',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'Which country is home to the city of Machu Picchu?',
      accepted: ['peru'],
    },
    {
      prompt: 'في أيّ بلد تقع مدينة ماتشو بيتشو؟',
      accepted: ['بيرو', 'البيرو'],
    },
  ),
  entry(
    'geography.equator-name',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the imaginary line at zero degrees latitude called?',
      accepted: ['equator', 'the equator'],
    },
    {
      prompt: 'ما اسم الخط التخيّلي عند صفر درجة عرض؟',
      accepted: ['خط الاستواء', 'الاستواء', 'خط الاستواء'],
    },
  ),
]);
