import { useEffect, useState } from "react";
import { CoverSlide, HookSlide, AftermathSlide, FounderSlide } from "./components/Slides1";
import { ReasonsSlide, Activity1Slide, TimelineSlide, ImamBioSlide, TraitsMatchSlide } from "./components/Slides2";
import { CapitalSlide, Activity2Slide, Activity3Slide, FactsSlide } from "./components/Slides3";
import { QuizSlide, FinaleSlide } from "./components/Quiz";
import { StudentGate } from "./components/StudentGate";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { LessonProvider, useLesson } from "./context/LessonContext";
import { SLIDE_TITLES } from "./data/lesson";
import { playClick, stopSpeaking, isMuted, setMuted } from "./utils/audio";
import { arNum } from "./data/lesson";

const QUIZ_TOTAL = 8;

function LessonApp() {
  const { student, view, setView, slideIndex, setSlideIndex, syncState, health, markCompleted, switchStudent } = useLesson();
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [muted, setMutedState] = useState(isMuted());

  const totalSlides = SLIDE_TITLES.length;

  useEffect(() => {
    if (student && !finished) setSlideIndex(slideIndex);
    // تسجيل الدخول للشريحة الحالية مرة واحدة عند بدء الجلسة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  const go = (n: number) => {
    stopSpeaking();
    playClick();
    setFinished(false);
    setSlideIndex(Math.max(0, Math.min(totalSlides - 1, n)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuizFinish = (score: number) => {
    stopSpeaking();
    markCompleted(score);
    setFinalScore(score);
    setFinished(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restart = () => {
    stopSpeaking();
    playClick();
    setFinished(false);
    setSlideIndex(0);
    window.scrollTo({ top: 0 });
  };

  const retakeQuiz = () => {
    stopSpeaking();
    playClick();
    setFinished(false);
    setSlideIndex(13);
    window.scrollTo({ top: 0 });
  };

  if (view === "teacher") {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-teal-50 via-amber-50/40 to-rose-50 font-[Tajawal,Cairo,sans-serif]">
        <main className="mx-auto max-w-6xl px-4 py-6">
          <TeacherDashboard />
        </main>
      </div>
    );
  }

  if (!student) {
    return (
      <div dir="rtl" className="min-h-screen font-[Tajawal,Cairo,sans-serif]">
        <button
          onClick={() => setView("teacher")}
          className="fixed bottom-4 left-4 z-40 rounded-full bg-teal-950/90 px-4 py-2 text-sm font-extrabold text-white shadow-lg"
        >
          🔐 لوحة المعلم
        </button>
        <StudentGate />
      </div>
    );
  }

  const renderSlide = () => {
    if (finished) return <FinaleSlide score={finalScore} total={QUIZ_TOTAL} onRestart={restart} onRetake={retakeQuiz} />;
    switch (slideIndex) {
      case 0: return <CoverSlide />;
      case 1: return <HookSlide />;
      case 2: return <AftermathSlide />;
      case 3: return <FounderSlide />;
      case 4: return <ReasonsSlide />;
      case 5: return <Activity1Slide />;
      case 6: return <TimelineSlide />;
      case 7: return <ImamBioSlide />;
      case 8: return <TraitsMatchSlide />;
      case 9: return <CapitalSlide />;
      case 10: return <Activity2Slide />;
      case 11: return <Activity3Slide />;
      case 12: return <FactsSlide />;
      case 13: return <QuizSlide onFinish={handleQuizFinish} />;
      default: return null;
    }
  };

  const syncLabel =
    syncState === "saving" ? "جاري الحفظ…" : syncState === "error" ? "تعذر الحفظ — سيُعاد المحاولة" : health.mode === "cloud" ? "محفوظ في السحابة" : "محفوظ على الجهاز";

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-teal-50 via-amber-50/40 to-rose-50 font-[Tajawal,Cairo,sans-serif]">
      <header className="sticky top-0 z-40 bg-teal-900/95 text-white shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow">🏰</span>
            <div>
              <h1 className="text-lg font-black leading-tight">تأسيس الدولة السعودية الثانية</h1>
              <p className="text-xs font-bold text-teal-200">
                {student.name}
                {student.className ? ` • ${student.className}` : ""} • {syncLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <button
              onClick={() => {
                setMuted(!muted);
                setMutedState(!muted);
              }}
              className="rounded-full bg-white/15 px-3 py-1"
              title="كتم المؤثرات"
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button onClick={() => setView("teacher")} className="rounded-full bg-white/15 px-3 py-1">
              لوحة المعلم
            </button>
            <button onClick={switchStudent} className="rounded-full bg-white/15 px-3 py-1">
              تغيير الطالب
            </button>
            <span className="rounded-full bg-white/15 px-3 py-1">{finished ? "النتيجة" : `${arNum(slideIndex + 1)} / ${arNum(totalSlides)}`}</span>
          </div>
        </div>
        <div className="h-1.5 bg-teal-950">
          <div
            className="h-full bg-gradient-to-l from-amber-400 to-amber-500 transition-all duration-500"
            style={{ width: `${(((finished ? totalSlides : slideIndex) + 1) / (totalSlides + 1)) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        {!finished && (
          <nav className="mb-5 flex gap-2 overflow-x-auto px-1 pb-3">
            {SLIDE_TITLES.map((s, i) => (
              <button
                key={s.title}
                onClick={() => go(i)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  i === slideIndex
                    ? "border-rose-700 bg-rose-700 text-white shadow-md"
                    : i < slideIndex
                      ? "border-teal-300 bg-teal-100 text-teal-800"
                      : "border-slate-200 bg-white text-slate-500 hover:border-teal-400"
                }`}
              >
                <span>{s.icon}</span> {s.title}
              </button>
            ))}
          </nav>
        )}

        {renderSlide()}

        {!finished && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              onClick={() => go(slideIndex - 1)}
              disabled={slideIndex === 0}
              className="rounded-xl border-2 border-teal-300 bg-white px-6 py-3 font-extrabold text-teal-800 shadow-sm transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              → السابق
            </button>
            <div className="hidden gap-1.5 md:flex">
              {SLIDE_TITLES.map((s, i) => (
                <span key={s.title} className={`h-2.5 rounded-full transition-all ${i === slideIndex ? "w-8 bg-rose-700" : "w-2.5 bg-slate-300"}`} />
              ))}
            </div>
            {slideIndex < totalSlides - 1 ? (
              <button onClick={() => go(slideIndex + 1)} className="rounded-xl bg-rose-700 px-8 py-3 font-extrabold text-white shadow-lg transition-all hover:scale-105 hover:bg-rose-800">
                التالي ←
              </button>
            ) : (
              <span className="rounded-xl border border-amber-300 bg-amber-100 px-6 py-3 text-sm font-extrabold text-amber-800">أكمل الاختبار لإنهاء الدرس 🏁</span>
            )}
          </div>
        )}
      </main>
      <footer className="pt-2 pb-8 text-center text-sm font-bold text-slate-500">
        الوحدة الثالثة • الدرس السابع — يُتابَع تقدم {student.name} من لوحة المعلم
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LessonProvider>
      <LessonApp />
    </LessonProvider>
  );
}
