export const SLIDE_TITLES = [
  { title: "الغلاف والأهداف", icon: "🏠" },
  { title: "التهيئة", icon: "💡" },
  { title: "بعد سقوط الدرعية", icon: "🃏" },
  { title: "المؤسس الجديد", icon: "🏅" },
  { title: "أسباب العودة", icon: "🗺️" },
  { title: "نشاط ١", icon: "✏️" },
  { title: "أئمة الدولة", icon: "⏳" },
  { title: "الإمام تركي", icon: "⭐" },
  { title: "صفات الإمام", icon: "🔗" },
  { title: "العاصمة الجديدة", icon: "🏙️" },
  { title: "نشاط ٢", icon: "✏️" },
  { title: "نشاط ٣", icon: "✏️" },
  { title: "للاطلاع", icon: "📖" },
  { title: "التقويم", icon: "📝" },
];

export const SLIDE_COUNT = SLIDE_TITLES.length;
export const QUIZ_TOTAL = 8;

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
};

export const QUESTIONS: QuizQuestion[] = [
  {
    q: "مؤسس الدولة السعودية الثانية هو:",
    options: ["الإمام محمد بن سعود", "الإمام تركي بن عبدالله", "الإمام فيصل بن تركي", "الإمام عبدالرحمن بن فيصل"],
    answer: 1,
    explain: "الإمام تركي بن عبدالله أعاد تأسيس الدولة السعودية في دورها الثاني عام ١٢٤٠هـ.",
  },
  {
    q: "تأسست الدولة السعودية الثانية عام:",
    options: ["١٢٣٣هـ", "١٢٤٩هـ", "١٢٤٠هـ", "١٣٠٩هـ"],
    answer: 2,
    explain: "أعلن الإمام تركي تأسيس الدولة السعودية الثانية عام ١٢٤٠هـ.",
  },
  {
    q: "عاصمة الدولة السعودية الثانية هي:",
    options: ["الدرعية", "الرياض", "مكة المكرمة", "الأحساء"],
    answer: 1,
    explain: "اتخذ الإمام تركي الرياض عاصمة للدولة السعودية الثانية.",
  },
  {
    q: "من نتائج سقوط الدرعية:",
    options: ["ازدهار التجارة", "بناء الأسوار", "انتشار الفوضى بسبب غياب الدولة", "عودة الاستقرار"],
    answer: 2,
    explain: "بعد سقوط الدرعية انتشرت الفوضى بسبب غياب الدولة، وحُرقت المزارع والكتب.",
  },
  {
    q: "اشتهر الإمام تركي بن عبدالله بسيفه المسمى:",
    options: ["الأجرب", "الصارم", "البتار", "الحسام"],
    answer: 0,
    explain: "من صفات الإمام تركي الشجاعة، وقد اشتهر بسيفه المسمى «الأجرب».",
  },
  {
    q: "المدة بين سقوط الدرعية وتأسيس الدولة السعودية الثانية:",
    options: ["عشرون سنة", "سبع سنوات فقط", "خمسون سنة", "ثلاث سنوات"],
    answer: 1,
    explain: "بعد سبع سنوات فقط من سقوط الدرعية استطاع الإمام تركي استرجاع الدولة.",
  },
  {
    q: "آخر أئمة الدولة السعودية الثانية هو:",
    options: ["الإمام فيصل بن تركي", "الإمام عبدالله بن فيصل", "الإمام تركي بن عبدالله", "الإمام عبدالرحمن بن فيصل"],
    answer: 3,
    explain: "الإمام عبدالرحمن بن فيصل حكم من ١٣٠٧هـ إلى ١٣٠٩هـ وهو آخر أئمتها.",
  },
  {
    q: "قصر الحكم اليوم أصبح:",
    options: ["متحفاً مهجوراً", "مقراً لإمارة منطقة الرياض", "سوقاً تجارياً", "مدرسة"],
    answer: 1,
    explain: "جرى تطوير قصر الحكم وجُعل مقراً لإمارة منطقة الرياض.",
  },
];

export const IMAM_NAMES = [
  "الإمام تركي بن عبدالله",
  "الإمام فيصل بن تركي",
  "الإمام عبدالله بن فيصل",
  "الإمام عبدالرحمن بن فيصل",
];

export const ANSWER_FIELDS: { key: string; label: string; group: string }[] = [
  { key: "activity1_1", label: "نشاط ١ — السبب الأول", group: "كتابة" },
  { key: "activity1_2", label: "نشاط ١ — السبب الثاني", group: "كتابة" },
  { key: "activity2_poem", label: "نشاط ٢ — معاني الأبيات الشعبية", group: "كتابة" },
  { key: "activity3_old", label: "نشاط ٣ — قصر الحكم قديماً", group: "كتابة" },
  { key: "activity3_new", label: "نشاط ٣ — قصر الحكم حديثاً", group: "كتابة" },
  { key: "aftermath_opened", label: "بطاقات ما بعد سقوط الدرعية", group: "تفاعل" },
  { key: "reasons_opened", label: "أسباب العودة التي اكتشفها", group: "تفاعل" },
  { key: "timeline_done", label: "ترتيب أئمة الدولة", group: "تفاعل" },
  { key: "traits_done", label: "مطابقة صفات الإمام تركي", group: "تفاعل" },
  { key: "hook_revealed", label: "كشف إجابة التهيئة", group: "تفاعل" },
  { key: "facts_opened", label: "صناديق الإثراء المفتوحة", group: "تفاعل" },
];

export const SFX_SOUNDS = [
  { key: "click", label: "نقرة التنقل", hint: "يُشغَّل عند الانتقال بين الشرائح" },
  { key: "flip", label: "قلب البطاقة", hint: "بطاقات ما بعد سقوط الدرعية" },
  { key: "reveal", label: "كشف معلومة", hint: "عند فتح سبب أو إجابة مقترحة" },
  { key: "correct", label: "إجابة صحيحة", hint: "الاختبار والمطابقة والترتيب" },
  { key: "wrong", label: "إجابة خاطئة", hint: "عند الخطأ في نشاط تفاعلي" },
  { key: "success", label: "احتفال النجاح", hint: "عند إكمال نشاط أو الاختبار" },
];

export const NARRATION_SOUNDS = [
  ...SLIDE_TITLES.map((s, i) => ({ key: `narr-${i}`, label: `شريحة ${i + 1}: ${s.title}` })),
  { key: "narr-finale", label: "الخلاصة النهائية" },
];

export function progressPercent(maxSlide: number, completed: boolean) {
  if (completed) return 100;
  return Math.max(0, Math.min(100, Math.round((maxSlide / (SLIDE_COUNT - 1)) * 100)));
}

export function arNum(n: number | string) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const m = Math.round(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${arNum(m)} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `قبل ${arNum(h)} س`;
  return `قبل ${arNum(Math.round(h / 24))} ي`;
}

export function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}
