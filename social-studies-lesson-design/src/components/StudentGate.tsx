import { useState } from "react";
import { useLesson } from "../context/LessonContext";
import { playClick, playSuccess } from "../utils/audio";

export function StudentGate() {
  const { savedSession, startStudent, resumeSaved, switchStudent, health } = useLesson();
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) {
      setError("اكتب اسمك كاملاً (حرفان على الأقل)");
      return;
    }
    setError("");
    setBusy(true);
    playClick();
    try {
      await startStudent(n, className);
      playSuccess();
    } catch {
      setError("تعذر بدء الدرس، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img src="/images/hero-diriyah.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/85 to-teal-900/55" />
      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm font-extrabold text-teal-50">
          <span className="rounded-full bg-amber-400 px-3 py-1 text-teal-950">الدراسات الاجتماعية</span>
          <span className="rounded-full bg-white/15 px-3 py-1">الصف السادس</span>
          <span className="rounded-full bg-white/15 px-3 py-1">الدرس السابع</span>
        </div>
        <h1 className="mb-2 text-4xl font-black leading-tight text-white md:text-5xl">
          تأسيس الدولة السعودية <span className="text-amber-300">الثانية</span>
        </h1>
        <p className="mb-6 text-lg font-semibold text-teal-50">أدخل اسمك ليحفظ المعلم تقدّمك وإجاباتك تلقائياً طوال الدرس.</p>

        {savedSession && (
          <div className="mb-4 rounded-2xl border border-white/25 bg-white/10 p-4 text-white backdrop-blur">
            <p className="font-extrabold">مرحباً بعودتك يا {savedSession.name}</p>
            <p className="mt-1 text-sm text-teal-100">
              يمكنك متابعة الدرس من حيث توقفت{savedSession.className ? ` • ${savedSession.className}` : ""}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  playClick();
                  resumeSaved();
                }}
                className="rounded-xl bg-amber-400 px-5 py-2.5 font-extrabold text-teal-950 shadow hover:bg-amber-300"
              >
                متابعة الدرس
              </button>
              <button
                onClick={() => {
                  playClick();
                  switchStudent();
                }}
                className="rounded-xl border border-white/40 px-5 py-2.5 font-bold text-white hover:bg-white/10"
              >
                طالب آخر
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="rounded-3xl border border-white/20 bg-white p-6 shadow-2xl md:p-8">
          <label className="mb-1 block font-extrabold text-slate-700">اسم الطالب</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: محمد العتيبي"
            maxLength={60}
            className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold focus:border-teal-500 focus:outline-none"
            autoFocus
          />
          <label className="mb-1 block font-extrabold text-slate-700">الشعبة (اختياري)</label>
          <input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="مثال: سادس / أ"
            maxLength={40}
            className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold focus:border-teal-500 focus:outline-none"
          />
          {error && <p className="mb-3 font-bold text-rose-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-rose-700 py-3.5 text-lg font-black text-white shadow-lg transition hover:bg-rose-800 disabled:opacity-60"
          >
            {busy ? "جاري الحفظ…" : "ابدأ الدرس"}
          </button>
          <p className="mt-3 text-center text-sm font-semibold text-slate-500">
            {health.mode === "cloud"
              ? "☁️ تُحفظ إجاباتك في قاعدة البيانات ليطّلع عليها المعلم"
              : health.mode === "unconfigured"
                ? "الخادم يعمل، لكن قاعدة Neon لم تُربط بعد — سيُحفظ تقدمك على هذا الجهاز مؤقتاً"
                : "وضع التجربة: يُحفظ تقدمك على هذا الجهاز، ويظهر في لوحة المعلم"}
          </p>
        </form>
      </div>
    </div>
  );
}
