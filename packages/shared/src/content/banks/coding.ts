import { defineBank } from './types.js';
import { entry } from './helpers.js';

export const codingBank = defineBank('coding', [
  entry(
    'coding.bug-meaning',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'What is a "bug" in a computer program?',
      options: [
        { id: 'a', text: 'A mistake that makes it behave wrongly' },
        { id: 'b', text: 'A type of computer' },
        { id: 'c', text: 'A kind of keyboard' },
        { id: 'd', text: 'A finished program' },
      ],
      correctOptionId: 'a',
    },
    {
      prompt: 'ما معنى "bug" في برنامج الحاسوب؟',
      options: [
        { id: 'a', text: 'خطأ يجعله يعمل بشكل خاطئ' },
        { id: 'b', text: 'نوع من الحواسيب' },
        { id: 'c', text: 'نوع من لوحات المفاتيح' },
        { id: 'd', text: 'برنامج مكتمل' },
      ],
    },
  ),
  entry(
    'coding.algorithm',
    {
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'What do we call a step-by-step set of instructions for solving a problem?',
      options: [
        { id: 'a', text: 'A variable' },
        { id: 'b', text: 'An algorithm' },
        { id: 'c', text: 'A pixel' },
        { id: 'd', text: 'A browser' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'ماذا نسمّي مجموعة التعليمات خطوة بخطوة لحلّ مشكلة؟',
      options: [
        { id: 'a', text: 'متغير' },
        { id: 'b', text: 'خوارزمية' },
        { id: 'c', text: 'بكسل' },
        { id: 'd', text: 'متصفح' },
      ],
    },
  ),
  entry(
    'coding.loop-repeat',
    {
      difficulty: 'easy',
      type: 'true_false',
      prompt: 'A loop lets a program repeat the same instructions.',
      correct: true,
    },
    {
      prompt: 'الحلقة تسمح للبرنامج بتكرار نفس التعليمات.',
    },
  ),
  entry(
    'coding.variable',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What do we call a named box that stores a value in a program?',
      accepted: ['variable', 'a variable'],
    },
    {
      prompt: 'ماذا نسمّي الصندوق المسمّى الذي يخزّن قيمة في البرنامج؟',
      accepted: ['متغير', 'المتغير'],
    },
  ),
  entry(
    'coding.bits-per-byte',
    {
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'How many bits are there in a byte?',
      accepted: ['8'],
    },
    {
      prompt: 'كم عدد البتات في البايت؟',
    },
  ),
  entry(
    'coding.python-language',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'Which of these is a programming language?',
      options: [
        { id: 'a', text: 'HTTP' },
        { id: 'b', text: 'Python' },
        { id: 'c', text: 'USB' },
        { id: 'd', text: 'JPEG' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'أيّ من هذه لغة برمجة؟',
      options: [
        { id: 'a', text: 'HTTP' },
        { id: 'b', text: 'Python' },
        { id: 'c', text: 'USB' },
        { id: 'd', text: 'JPEG' },
      ],
    },
  ),
  entry(
    'coding.if-statement',
    {
      difficulty: 'medium',
      type: 'multiple_choice',
      prompt: 'What does an "if" statement do?',
      options: [
        { id: 'a', text: 'Repeats code forever' },
        { id: 'b', text: 'Stores a list of values' },
        { id: 'c', text: 'Runs code only when a condition is true' },
        { id: 'd', text: 'Prints text to the screen' },
      ],
      correctOptionId: 'c',
    },
    {
      prompt: 'ماذا يفعل عبارة "if"؟',
      options: [
        { id: 'a', text: 'يكرّر الكود إلى ما لا نهاية' },
        { id: 'b', text: 'يخزّن قائمة من القيم' },
        { id: 'c', text: 'ينفّذ الكود فقط عندما يكون الشرط صحيحًا' },
        { id: 'd', text: 'يعرض نصًا على الشاشة' },
      ],
    },
  ),
  entry(
    'coding.index-zero',
    {
      difficulty: 'medium',
      type: 'true_false',
      prompt: 'In most programming languages, the first item of a list is at index 1.',
      correct: false,
      explanation: 'Most languages count from zero, so the first item is at index 0.',
    },
    {
      prompt: 'في معظم لغات البرمجة، العنصر الأول في القائمة يكون في الفهرس 1.',
      explanation: 'معظم اللغات تبدأ العد من الصفر، لذا العنصر الأول يكون في الفهرس 0.',
    },
  ),
  entry(
    'coding.function',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What do we call a reusable block of code that you can call by name?',
      accepted: ['function', 'a function', 'method'],
    },
    {
      prompt: 'ماذا نسمّي كتلة الكود القابلة لإعادة الاستخدام التي يمكن استدعاؤها بالاسم؟',
      accepted: ['دالة', 'الدالة', 'وظيفة'],
    },
  ),
  entry(
    'coding.binary-1010',
    {
      difficulty: 'medium',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'In binary, what is the decimal value of 1010?',
      accepted: ['10'],
    },
    {
      prompt: 'في النظام الثنائي، ما القيمة العشرية لـ 1010؟',
    },
  ),
  entry(
    'coding.html-stands-for',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'What does HTML stand for?',
      options: [
        { id: 'a', text: 'HyperText Markup Language' },
        { id: 'b', text: 'High Transfer Machine Language' },
        { id: 'c', text: 'Hyperlink Text Making Language' },
        { id: 'd', text: 'Home Tool Markup Language' },
      ],
      correctOptionId: 'a',
    },
    {
      prompt: 'ماذا تعني HTML؟',
      options: [
        { id: 'a', text: 'HyperText Markup Language' },
        { id: 'b', text: 'High Transfer Machine Language' },
        { id: 'c', text: 'Hyperlink Text Making Language' },
        { id: 'd', text: 'Home Tool Markup Language' },
      ],
    },
  ),
  entry(
    'coding.stack-lifo',
    {
      difficulty: 'hard',
      type: 'multiple_choice',
      prompt: 'Which data structure follows "last in, first out"?',
      options: [
        { id: 'a', text: 'Queue' },
        { id: 'b', text: 'Stack' },
        { id: 'c', text: 'Tree' },
        { id: 'd', text: 'Graph' },
      ],
      correctOptionId: 'b',
    },
    {
      prompt: 'أيّ هيكل بيانات يتبع مبدأ "آخر ما دخل أول ما يخرج"؟',
      options: [
        { id: 'a', text: 'طابور' },
        { id: 'b', text: 'مكدس' },
        { id: 'c', text: 'شجرة' },
        { id: 'd', text: 'رسم بياني' },
      ],
    },
  ),
  entry(
    'coding.recursive',
    {
      difficulty: 'hard',
      type: 'true_false',
      prompt: 'A function that calls itself is described as recursive.',
      correct: true,
    },
    {
      prompt: 'الدالة التي تستدعي نفسها تُسمّى دالة متكرّرة.',
    },
  ),
  entry(
    'coding.debugging',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What do we call the process of finding and fixing errors in code?',
      accepted: ['debugging', 'debug'],
    },
    {
      prompt: 'ماذا نسمّي عملية إيجاد الأخطاء وإصلاحها في الكود؟',
      accepted: ['تصحيح الأخطاء', 'إزالة الأخطاء', 'debugging', 'debug'],
    },
  ),
  entry(
    'coding.byte-values',
    {
      difficulty: 'hard',
      type: 'type_answer',
      inputMode: 'number',
      prompt: 'How many different values can a single byte represent?',
      accepted: ['256'],
    },
    {
      prompt: 'كم عدد القيم المختلفة التي يمكن أن يمثّلها بايت واحد؟',
    },
  ),
]);
