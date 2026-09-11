import { defineBank } from './types.js';
import { entry } from './helpers.js';

export const scienceBank = defineBank('science', [
  entry(
    'science.red-planet',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'Which planet is known as the Red Planet?',
      options: [
        { id: 'a', text: 'Mars' },
        { id: 'b', text: 'Earth' },
        { id: 'c', text: 'Venus' },
        { id: 'd', text: 'Jupiter' },
      ],
      correctOptionId: 'a',
      explanation: 'Iron oxide dust gives the Martian surface its rusty colour.',
    },
    {
      prompt: 'أيّ كوكب يُعرف بالكوكب الأحمر؟',
      options: [
        { id: 'a', text: 'المريخ' },
        { id: 'b', text: 'الأرض' },
        { id: 'c', text: 'الزهرة' },
        { id: 'd', text: 'المشتري' },
      ],
      explanation: 'غبار أكسيد الحديد يُعطي سطح المريخ لونه الصدئي.',
    },
  ),
  entry(
    'science.plant-co2',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'What gas do plants take in to make their food?',
      options: [
        { id: 'a', text: 'Oxygen' },
        { id: 'b', text: 'Carbon dioxide' },
        { id: 'c', text: 'Nitrogen' },
        { id: 'd', text: 'Hydrogen' },
      ],
      correctOptionId: 'b',
      explanation: 'Photosynthesis combines carbon dioxide and water using sunlight.',
    },
    {
      prompt: 'أيّ غاز يمتصّه النبات لصنع غذائه؟',
      options: [
        { id: 'a', text: 'الأكسجين' },
        { id: 'b', text: 'ثاني أكسيد الكربون' },
        { id: 'c', text: 'النيتروجين' },
        { id: 'd', text: 'الهيدروجين' },
      ],
      explanation: 'التركيب الضوئي يجمع ثاني أكسيد الكربون والماء باستخدام ضوء الشمس.',
    },
  ),
  entry(
    'science.sun-is-star',
    {
      difficulty: 'easy',
      type: 'true_false',
      prompt: 'The Sun is a star.',
      correct: true,
    },
    {
      prompt: 'الشمس نجم.',
    },
  ),
  entry(
    'science.spiders-not-insects',
    {
      difficulty: 'easy',
      type: 'true_false',
      prompt: 'Spiders are insects.',
      correct: false,
      explanation: 'Spiders are arachnids: eight legs and two body sections, not six and three.',
    },
    {
      prompt: 'العناكب من الحشرات.',
      explanation: 'العناكب من العنكبيات: لها ثمانية أرجل وقسمان للجسم، وليس ستة أرجل وثلاثة أقسام.',
    },
  ),
  entry(
    'science.gravity',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What force pulls objects towards the centre of the Earth?',
      accepted: ['gravity'],
    },
    {
      prompt: 'ما القوة التي تسحب الأجسام نحو مركز الأرض؟',
      accepted: ['الجاذبية', 'جاذبية'],
    },
  ),
  entry(
    'science.xylem',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Which part of a plant carries water up from the roots?',
      options: [
        { id: 'a', text: 'Phloem' },
        { id: 'b', text: 'Xylem' },
        { id: 'c', text: 'Stomata' },
        { id: 'd', text: 'Cuticle' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'أيّ جزء من النبات ينقل الماء صعودًا من الجذور؟',
      options: [
        { id: 'a', text: 'العروق اللحائية' },
        { id: 'b', text: 'الأوعية الخشبية' },
        { id: 'c', text: 'الثغور' },
        { id: 'd', text: 'الطبقة الشمعية' },
      ],
    },
  ),
  entry(
    'science.potassium-symbol',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'What is the chemical symbol for potassium?',
      options: [
        { id: 'a', text: 'P' },
        { id: 'b', text: 'Pt' },
        { id: 'c', text: 'K' },
        { id: 'd', text: 'Po' },
      ],
      correctOptionId: 'c',
      explanation: 'K comes from the Latin name kalium.',
    },
    {
      prompt: 'ما الرمز الكيميائي للبوتاسيوم؟',
      options: [
        { id: 'a', text: 'P' },
        { id: 'b', text: 'Pt' },
        { id: 'c', text: 'K' },
        { id: 'd', text: 'Po' },
      ],
      explanation: 'حرف K يأتي من الاسم اللاتيني kalium.',
    },
  ),
  entry(
    'science.sound-in-water',
    {
      difficulty: 'medium',
      type: 'true_false',
      prompt: 'Sound travels faster through water than through air.',
      correct: true,
      explanation: 'Water is denser, so its particles pass the vibration along more quickly.',
    },
    {
      prompt: 'الصوت ينتقل أسرع في الماء منه في الهواء.',
      explanation: 'الماء أكثر كثافة، لذا تمرّر جزيئاته الاهتزاز بسرعة أكبر.',
    },
  ),
  entry(
    'science.mitochondria',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the powerhouse of the cell?',
      accepted: ['mitochondria', 'mitochondrion'],
    },
    {
      prompt: 'ما محطة الطاقة في الخلية؟',
      accepted: ['الميتوكوندريا', 'ميتوكوندريا', 'ميتوكوندريون'],
    },
  ),
  entry(
    'science.adult-bones',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'How many bones are there in an adult human body?',
      accepted: ['206'],
    },
    {
      prompt: 'كم عدد العظام في جسم الإنسان البالغ؟',
    },
  ),
  entry(
    'science.electron',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'Which subatomic particle carries a negative charge?',
      options: [
        { id: 'a', text: 'Proton' },
        { id: 'b', text: 'Neutron' },
        { id: 'c', text: 'Electron' },
        { id: 'd', text: 'Positron' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'أيّ جسيم دون ذري يحمل شحنة سلبية؟',
      options: [
        { id: 'a', text: 'البروتون' },
        { id: 'b', text: 'النيوترون' },
        { id: 'c', text: 'الإلكترون' },
        { id: 'd', text: 'البوزيترون' },
      ],
    },
  ),
  entry(
    'science.nitrogen-atmosphere',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'What is the most abundant gas in the Earth\u2019s atmosphere?',
      options: [
        { id: 'a', text: 'Oxygen' },
        { id: 'b', text: 'Nitrogen' },
        { id: 'c', text: 'Carbon dioxide' },
        { id: 'd', text: 'Argon' },
      ],
      correctOptionId: 'b',
      explanation: 'Nitrogen makes up roughly 78 per cent of the air by volume.',
    },
    {
      prompt: 'ما الغاز الأكثر وفرةً في غلاف الأرض الجوي؟',
      options: [
        { id: 'a', text: 'الأكسجين' },
        { id: 'b', text: 'النيتروجين' },
        { id: 'c', text: 'ثاني أكسيد الكربون' },
        { id: 'd', text: 'الأرغون' },
      ],
      explanation: 'النيتروجين يشكّل نحو 78 بالمئة من حجم الهواء.',
    },
  ),
  entry(
    'science.light-in-glass',
    {
      difficulty: 'hard',
      type: 'true_false',
      prompt: 'Light travels more slowly through glass than through a vacuum.',
      correct: true,
    },
    {
      prompt: 'الضوء ينتقل أبطأ عبر الزجاج منه في الفراغ.',
    },
  ),
  entry(
    'science.evaporation',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the process by which a liquid turns into a gas at its surface?',
      accepted: ['evaporation'],
    },
    {
      prompt: 'ما العملية التي يتحوّل بها السائل إلى غاز على سطحه؟',
      accepted: ['التبخر', 'تبخر'],
    },
  ),
  entry(
    'science.carbon-atomic-number',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'What is the atomic number of carbon?',
      accepted: ['6'],
    },
    {
      prompt: 'ما العدد الذري للكربون؟',
    },
  ),
]);
