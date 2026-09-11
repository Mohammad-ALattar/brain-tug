import { defineBank } from './types.js';
import { entry } from './helpers.js';

export const historyBank = defineBank('history', [
  entry(
    'history.giza-pyramids',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'Which ancient civilisation built the pyramids at Giza?',
      options: [
        { id: 'a', text: 'The Romans' },
        { id: 'b', text: 'The Egyptians' },
        { id: 'c', text: 'The Greeks' },
        { id: 'd', text: 'The Aztecs' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'أيّ حضارة قديمة بنت أهرامات الجيزة؟',
      options: [
        { id: 'a', text: 'الرومان' },
        { id: 'b', text: 'المصريون' },
        { id: 'c', text: 'اليونانيون' },
        { id: 'd', text: 'الأزتيك' },
      ],
    },
  ),
  entry(
    'history.castles-defence',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'What were the large stone castles of medieval Europe mainly built for?',
      options: [
        { id: 'a', text: 'Defence' },
        { id: 'b', text: 'Farming' },
        { id: 'c', text: 'Shipbuilding' },
        { id: 'd', text: 'Mining' },
      ],
      correctOptionId: 'a',
    },
    {
      prompt: 'لماذا بُنيت القلاع الحجرية الكبيرة في أوروبا الوسطى في الغالب؟',
      options: [
        { id: 'a', text: 'الدفاع' },
        { id: 'b', text: 'الزراعة' },
        { id: 'c', text: 'بناء السفن' },
        { id: 'd', text: 'التعدين' },
      ],
    },
  ),
  entry(
    'history.titanic-first-voyage',
    {
      difficulty: 'easy',
      type: 'true_false',
      prompt: 'The Titanic sank on its first voyage.',
      correct: true,
    },
    {
      prompt: 'غرقت سفينة تايتانيك في رحلتها الأولى.',
    },
  ),
  entry(
    'history.historian',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What do we call a person who studies the past?',
      accepted: ['historian'],
    },
    {
      prompt: 'ماذا نسمّي الشخص الذي يدرس الماضي؟',
      accepted: ['مؤرخ', 'المؤرخ'],
    },
  ),
  entry(
    'history.stone-tools',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What were the earliest widespread cutting tools typically made from?',
      accepted: ['stone', 'flint'],
    },
    {
      prompt: 'من أيّ مادة صُنعت أدوات القطع الأولى المنتشرة عادةً؟',
      accepted: ['الحجر', 'حجر', 'الصوان', 'صوان'],
    },
  ),
  entry(
    'history.ww2-end',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'In which year did the Second World War end?',
      options: [
        { id: 'a', text: '1918' },
        { id: 'b', text: '1939' },
        { id: 'c', text: '1945' },
        { id: 'd', text: '1951' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'في أيّ سنة انتهت الحرب العالمية الثانية؟',
      options: [
        { id: 'a', text: '1918' },
        { id: 'b', text: '1939' },
        { id: 'c', text: '1945' },
        { id: 'd', text: '1951' },
      ],
    },
  ),
  entry(
    'history.moon-armstrong',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Who was the first person to walk on the Moon?',
      options: [
        { id: 'a', text: 'Buzz Aldrin' },
        { id: 'b', text: 'Yuri Gagarin' },
        { id: 'c', text: 'Michael Collins' },
        { id: 'd', text: 'Neil Armstrong' },
      ],
      correctOptionId: 'd',
    },
    {
      prompt: 'من كان أول شخص يمشي على سطح القمر؟',
      options: [
        { id: 'a', text: 'Buzz Aldrin' },
        { id: 'b', text: 'Yuri Gagarin' },
        { id: 'c', text: 'Michael Collins' },
        { id: 'd', text: 'Neil Armstrong' },
      ],
    },
  ),
  entry(
    'history.great-wall',
    {
      difficulty: 'medium',
      type: 'true_false',
      prompt: 'The Great Wall of China is a single unbroken wall.',
      correct: false,
      explanation: 'It is a network of walls and fortifications built over many dynasties.',
    },
    {
      prompt: 'سور الصين العظيم سور واحد متصل بلا انقطاع.',
      explanation: 'هو شبكة من الأسوار والتحصينات بُنيت عبر عدة عصور حاكمة.',
    },
  ),
  entry(
    'history.roman-empire',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'Which empire was ruled from the city of Rome?',
      accepted: ['roman empire', 'the roman empire', 'roman'],
    },
    {
      prompt: 'أيّ إمبراطورية حُكمَت من مدينة روما؟',
      accepted: ['الإمبراطورية الرومانية', 'رومان', 'الرومان'],
    },
  ),
  entry(
    'history.henry-viii-wives',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'How many wives did King Henry VIII of England have?',
      accepted: ['6'],
    },
    {
      prompt: 'كم عدد زوجات الملك هنري الثامن ملك إنجلترا؟',
    },
  ),
  entry(
    'history.renaissance-italy',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'The Renaissance began in which country?',
      options: [
        { id: 'a', text: 'France' },
        { id: 'b', text: 'Italy' },
        { id: 'c', text: 'England' },
        { id: 'd', text: 'Spain' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'في أيّ بلد بدأت عصر النهضة؟',
      options: [
        { id: 'a', text: 'فرنسا' },
        { id: 'b', text: 'إيطاليا' },
        { id: 'c', text: 'إنجلترا' },
        { id: 'd', text: 'إسبانيا' },
      ],
    },
  ),
  entry(
    'history.magna-carta',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'Which document, sealed in 1215, limited the power of the English king?',
      options: [
        { id: 'a', text: 'The Domesday Book' },
        { id: 'b', text: 'The Bill of Rights' },
        { id: 'c', text: 'Magna Carta' },
        { id: 'd', text: 'The Act of Union' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'أيّ وثيقة، خُتمت عام 1215، حدّت من سلطات ملك إنجلترا؟',
      options: [
        { id: 'a', text: 'The Domesday Book' },
        { id: 'b', text: 'The Bill of Rights' },
        { id: 'c', text: 'Magna Carta' },
        { id: 'd', text: 'The Act of Union' },
      ],
    },
  ),
  entry(
    'history.printing-press-paper',
    {
      difficulty: 'hard',
      type: 'true_false',
      prompt: 'The printing press was invented in Europe before paper reached it.',
      correct: false,
      explanation: 'Paper arrived in Europe centuries before Gutenberg\u2019s press of the 1450s.',
    },
    {
      prompt: 'اخترع المطبعة في أوروبا قبل وصول الورق إليها.',
      explanation: 'وصل الورق إلى أوروبا قبل قرون من مطبعة غوتنبرغ في الخمسينيات من القرن الخامس عشر.',
    },
  ),
  entry(
    'history.nile-egypt',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'Which river was central to the civilisation of ancient Egypt?',
      accepted: ['nile', 'the nile', 'river nile'],
    },
    {
      prompt: 'أيّ نهر كان محورًا لحضارة مصر القديمة؟',
      accepted: ['النيل', 'نيل', 'نهر النيل'],
    },
  ),
  entry(
    'history.industrial-revolution-century',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'In which century did the Industrial Revolution begin in Britain? Give the century as a number.',
      accepted: ['18'],
      explanation: 'It began in the 18th century, from around the 1760s.',
    },
    {
      prompt: 'في أيّ قرن بدأت الثورة الصناعية في بريطانيا؟ اكتب رقم القرن.',
      explanation: 'بدأت في القرن الثامن عشر، من حوالي عام 1760.',
    },
  ),
]);
