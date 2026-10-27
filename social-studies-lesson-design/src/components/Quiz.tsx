import { useState } from "react";
import { StrategyBadge, SpeakButton, SectionTitle, SlideCard } from "./Shared";
import { playCorrect, playWrong, playSuccess, playClick } from "../utils/audio";
import { QUESTIONS } from "../data/lesson";
import { useLesson } from "../context/LessonContext";

function resumeQuiz(answers: Record<string, string>) {
  let score = 0;
  let firstOpen = 0;
  let found = false;
  for (let i = 0; i < QUESTIONS.length; i++) {
    const raw = answers[`quiz_q${i}`];
    if (raw === undefined || raw === "") {
      if (!found) {
        firstOpen = i;
        found = true;
      }
    } else if (Number(raw) === QUESTIONS[i].answer) score++;
  }
  if (!found) {
    const last = QUESTIONS.length - 1;
    return { current: last, score, selected: Number(answers[`quiz_q${last}`]), answered: true };
  }
  return { current: firstOpen, score, selected: null as number | null, answered: false };
}

export function QuizSlide({ onFinish }: { onFinish: (score: number) => void }) {
  const { answers, saveAnswer } = useLesson();
  const initial = resumeQuiz(answers);
  const [current, setCurrent] = useState(initial.current);
  const [selected, setSelected] = useState<number | null>(initial.selected);
  const [score, setScore] = useState(initial.score);
  const [answered, setAnswered] = useState(initial.answered);

  const q = QUESTIONS[current];

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    const correct = i === q.answer;
    const nextScore = score + (correct ? 1 : 0);
    if (correct) playCorrect();
    else playWrong();
    setScore(nextScore);
    saveAnswer(`quiz_q${current}`, String(i));
    saveAnswer(`quiz_q${current}_text`, q.options[i]);
    saveAnswer("quiz_score", String(nextScore));
  };

  const next = () => {
    playClick();
    if (current + 1 < QUESTIONS.length) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      playSuccess();
      onFinish(score);
    }
  };

  return (
    <SlideCard>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <SectionTitle icon="📝">التقويم الختامي</SectionTitle>
        <StrategyBadge name="التقويم التفاعلي" icon="🏆" />
      </div>
      <div className="flex items-center justify-between mb-5">
        <span className="font-extrabold text-slate-600">
          السؤال {current + 1} من {QUESTIONS.length}
        </span>
        <span className="rounded-full bg-amber-100 border border-amber-300 px-4 py-1 font-extrabold text-amber-800">
          ⭐ النقاط: {score}
        </span>
      </div>
      <div className="h-2.5 bg-slate-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-teal-500 to-teal-700 rounded-full transition-all duration-500"
          style={{ width: `${((current + (answered ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
        />
      </div>
      <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-5 mb-5">
        <p className="text-xl font-extrabold text-teal-900">{q.q}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        {q.options.map((opt, i) => {
          let style = "bg-white border-slate-300 hover:border-teal-500 hover:scale-[1.02]";
          if (answered) {
            if (i === q.answer) style = "bg-teal-100 border-teal-500 text-teal-900";
            else if (i === selected) style = "bg-rose-100 border-rose-500 text-rose-900";
            else style = "bg-white border-slate-200 opacity-60";
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={answered}
              className={`rounded-xl border-2 px-5 py-4 font-extrabold text-right transition-all flex items-center gap-3 ${style}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-300 text-sm font-black">
                {["أ", "ب", "ج", "د"][i]}
              </span>
              {opt}
              {answered && i === q.answer && <span className="mr-auto text-xl">✅</span>}
              {answered && i === selected && i !== q.answer && <span className="mr-auto text-xl">❌</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`rounded-xl p-4 mb-5 font-bold animate-slidein ${selected === q.answer ? "bg-teal-50 border border-teal-300 text-teal-900" : "bg-rose-50 border border-rose-300 text-rose-900"}`}>
          {selected === q.answer ? "🎉 أحسنت! إجابة صحيحة. " : "💪 لا بأس، حاول في السؤال القادم. "}
          {q.explain}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {answered && (
          <button
            onClick={next}
            className="rounded-xl bg-rose-700 text-white font-extrabold px-8 py-3 shadow-lg hover:bg-rose-800 transition-colors"
          >
            {current + 1 < QUESTIONS.length ? "السؤال التالي ←" : "🏁 عرض النتيجة النهائية"}
          </button>
        )}
        <SpeakButton label="اقرأ السؤال" text={`${q.q} الخيارات هي: ${q.options.join("، ")}`} />
      </div>
    </SlideCard>
  );
}

export function FinaleSlide({
  score,
  total,
  onRestart,
  onRetake,
}: {
  score: number;
  total: number;
  onRestart: () => void;
  onRetake: () => void;
}) {
  const { student, clearQuiz } = useLesson();
  const percent = Math.round((score / total) * 100);
  const msg =
    percent >= 90
      ? "ممتاز! أنت مؤرخ صغير بارع 🏆"
      : percent >= 70
      ? "أحسنت! أداء رائع جداً 🌟"
      : percent >= 50
      ? "جيد! راجع الدرس لتتقنه أكثر 💪"
      : "لا بأس! أعد المحاولة وستتحسن بالتأكيد 📚";
  return (
    <SlideCard>
      <div className="text-center py-6">
        <div className="text-7xl mb-4">{percent >= 70 ? "🎉" : percent >= 50 ? "👏" : "💪"}</div>
        <h2 className="text-3xl md:text-4xl font-black text-rose-800 mb-3">انتهى الدرس{student ? ` يا ${student.name}` : ""}!</h2>
        <p className="text-xl font-extrabold text-slate-700 mb-6">{msg}</p>
        <div className="inline-flex items-center gap-6 bg-teal-50 border-2 border-teal-200 rounded-2xl px-10 py-6 mb-8">
          <div>
            <p className="text-5xl font-black text-teal-700">{score}/{total}</p>
            <p className="font-bold text-slate-500 mt-1">إجابات صحيحة</p>
          </div>
          <div className="h-16 w-px bg-teal-200" />
          <div>
            <p className="text-5xl font-black text-amber-600">{percent}٪</p>
            <p className="font-bold text-slate-500 mt-1">النسبة</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 max-w-2xl mx-auto mb-8 text-right">
          <h3 className="font-extrabold text-amber-900 mb-2">📋 ماذا تعلمنا اليوم؟</h3>
          <ul className="list-disc pr-6 space-y-1 font-semibold text-amber-900 text-sm">
            <li>ما حدث بعد سقوط الدرعية عام ١٢٣٣هـ.</li>
            <li>أسباب عودة الدولة السعودية مرة ثانية.</li>
            <li>الإمام تركي بن عبدالله أسس الدولة السعودية الثانية عام ١٢٤٠هـ وعاصمتها الرياض.</li>
            <li>صفات الإمام تركي: الإيمان، التخطيط، الشجاعة، المواطنة، العدل.</li>
            <li>أئمة الدولة السعودية الثانية الأربعة بالترتيب.</li>
          </ul>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={onRestart}
            className="rounded-xl bg-teal-700 text-white font-extrabold px-8 py-3 shadow-lg hover:bg-teal-800 transition-colors"
          >
            🔄 إعادة الدرس من البداية
          </button>
          <button
            onClick={() => {
              clearQuiz();
              onRetake();
            }}
            className="rounded-xl border-2 border-rose-300 bg-white px-6 py-3 font-extrabold text-rose-700"
          >
            محاولة اختبار جديدة
          </button>
          <SpeakButton
            audioKey="narr-finale"
            label="استمع للخلاصة"
            text={`أحسنتم يا ${student?.name || "طلابنا"}. حصلتم على ${score} إجابات صحيحة من ${total}. تعلمنا اليوم أن الإمام تركي بن عبدالله أعاد تأسيس الدولة السعودية الثانية عام ألف ومئتين وأربعين للهجرة، واتخذ الرياض عاصمة لها، وتميز بصفات عظيمة هي الإيمان والتخطيط والشجاعة والمواطنة والعدل. إلى اللقاء في درس جديد.`}
          />
        </div>
      </div>
    </SlideCard>
  );
}
