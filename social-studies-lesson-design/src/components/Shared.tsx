import { useEffect, useState } from "react";
import { speak, stopSpeaking, playClick, playNarration, hasCustomSound, onSoundsChanged } from "../utils/audio";
import { useLesson } from "../context/LessonContext";

/** شارة الاستراتيجية التعليمية المستخدمة في الشريحة */
export function StrategyBadge({ name, icon }: { name: string; icon: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-300 px-4 py-1.5 text-amber-800 text-sm font-bold shadow-sm">
      <span className="text-base">{icon}</span>
      <span>استراتيجية: {name}</span>
    </div>
  );
}

/** زر التعليق الصوتي - ملف المعلم إن وُجد، وإلا قراءة آلية */
export function SpeakButton({ text, label = "استمع للشرح", audioKey }: { text: string; label?: string; audioKey?: string }) {
  const { slideIndex } = useLesson();
  const [speaking, setSpeaking] = useState(false);
  const [, bump] = useState(0);
  const key = audioKey ?? `narr-${slideIndex}`;

  useEffect(() => onSoundsChanged(() => bump((n) => n + 1)), []);
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const toggle = () => {
    playClick();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (playNarration(key, () => setSpeaking(false))) {
      setSpeaking(true);
      return;
    }
    setSpeaking(true);
    speak(text, () => setSpeaking(false));
  };

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all shadow-md ${
        speaking
          ? "bg-rose-600 text-white animate-pulse"
          : "bg-teal-600 text-white hover:bg-teal-700 hover:scale-105"
      }`}
    >
      {speaking ? (
        <>
          <span className="text-lg">⏹️</span> إيقاف القراءة
        </>
      ) : (
        <>
          <span className="text-lg">🔊</span> {label}
          {hasCustomSound(key) && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">ملف المعلم</span>}
        </>
      )}
    </button>
  );
}

/** عنوان القسم بنمط الكتاب المدرسي */
export function SectionTitle({ children, icon = "❓" }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-700 text-white text-lg shadow-md shrink-0">
        {icon}
      </span>
      <h2 className="text-2xl md:text-3xl font-extrabold text-rose-800">{children}</h2>
    </div>
  );
}

/** إطار الشريحة */
export function SlideCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border-2 border-teal-100 p-6 md:p-10 animate-slidein">
      {children}
    </div>
  );
}

/** شريط عنوان نشاط بنمط الكتاب */
export function ActivityHeader({ number }: { number: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-2xl">✏️</span>
      <div className="flex items-center gap-0 rounded-lg overflow-hidden border-2 border-rose-700 shadow-sm">
        <span className="bg-white px-4 py-1.5 font-extrabold text-rose-700 text-lg">نشاط</span>
        <span className="bg-rose-700 text-white px-4 py-1.5 font-extrabold text-lg">{number}</span>
      </div>
      <div className="flex-1 border-b-2 border-dashed border-rose-300" />
    </div>
  );
}
