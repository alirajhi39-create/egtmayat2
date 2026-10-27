import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  type AppMode,
  type HealthInfo,
  type StudentRecord,
  clearTeacherToken,
  detectHealth,
  fetchStudent,
  getSessionId,
  getTeacherToken,
  listStudents,
  loadAllSounds,
  newStudent,
  pushLocalClassToCloud,
  saveAnswers,
  saveProgress,
  setSessionId,
  teacherLogin,
} from "../utils/backend";
import { QUIZ_TOTAL } from "../data/lesson";

type SyncState = "idle" | "saving" | "saved" | "error";

type LessonContextValue = {
  health: HealthInfo;
  refreshHealth: () => Promise<void>;
  student: StudentRecord | null;
  answers: Record<string, string>;
  savedSession: StudentRecord | null;
  startStudent: (name: string, className: string) => Promise<void>;
  resumeSaved: () => void;
  switchStudent: () => void;
  slideIndex: number;
  setSlideIndex: (n: number) => void;
  saveAnswer: (key: string, value: string) => void;
  markCompleted: (score: number) => void;
  clearQuiz: () => void;
  syncState: SyncState;
  view: "lesson" | "teacher";
  setView: (v: "lesson" | "teacher") => void;
  teacherAuthed: boolean;
  loginTeacher: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  logoutTeacher: () => void;
  reloadStudents: () => Promise<StudentRecord[]>;
};

const LessonContext = createContext<LessonContextValue | null>(null);

export function useLesson() {
  const ctx = useContext(LessonContext);
  if (!ctx) throw new Error("useLesson خارج المزوّد");
  return ctx;
}

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthInfo>({ mode: "local", pinSet: true, pinFromEnv: false });
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [savedSession, setSavedSession] = useState<StudentRecord | null>(null);
  const [slideIndex, setSlideIndexState] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [view, setView] = useState<"lesson" | "teacher">("lesson");
  const [teacherAuthed, setTeacherAuthed] = useState(Boolean(getTeacherToken()));
  const modeRef = useRef<AppMode>("local");
  const progressTimer = useRef<number | null>(null);
  const answerTimer = useRef<number | null>(null);
  const dirtyAnswers = useRef<Record<string, string>>({});
  const studentRef = useRef<StudentRecord | null>(null);

  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  useEffect(() => {
    const flushNow = () => {
      const current = studentRef.current;
      if (!current) return;
      const dirty = { ...dirtyAnswers.current };
      dirtyAnswers.current = {};
      saveProgress(current, modeRef.current).catch(() => setSyncState("error"));
      if (Object.keys(dirty).length) saveAnswers(current.id, dirty, modeRef.current).catch(() => setSyncState("error"));
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  const applyHealth = async (force = false) => {
    const info = await detectHealth(force);
    modeRef.current = info.mode;
    setHealth(info);
    loadAllSounds(info.mode).catch(() => {});
    return info;
  };

  useEffect(() => {
    (async () => {
      const info = await applyHealth();
      const sid = getSessionId();
      if (sid) {
        const remote = await fetchStudent(sid, info.mode);
        if (remote) setSavedSession(remote);
      }
      if (info.mode === "cloud" && !localStorage.getItem("diriyah_cloud_migrated")) {
        try {
          await pushLocalClassToCloud();
          localStorage.setItem("diriyah_cloud_migrated", "1");
        } catch {
          /* تُعاد المحاولة لاحقاً */
        }
      }
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushProgress = (rec: StudentRecord) => {
    if (progressTimer.current) window.clearTimeout(progressTimer.current);
    progressTimer.current = window.setTimeout(async () => {
      setSyncState("saving");
      try {
        await saveProgress(rec, modeRef.current);
        setSyncState("saved");
      } catch {
        setSyncState("error");
      }
    }, 450);
  };

  const flushAnswers = (id: string) => {
    if (answerTimer.current) window.clearTimeout(answerTimer.current);
    answerTimer.current = window.setTimeout(async () => {
      const payload = { ...dirtyAnswers.current };
      dirtyAnswers.current = {};
      if (!Object.keys(payload).length) return;
      setSyncState("saving");
      try {
        await saveAnswers(id, payload, modeRef.current);
        setSyncState("saved");
      } catch {
        dirtyAnswers.current = { ...payload, ...dirtyAnswers.current };
        setSyncState("error");
      }
    }, 600);
  };

  const startStudent = async (name: string, className: string) => {
    const info = await detectHealth();
    modeRef.current = info.mode;
    setHealth(info);
    const rec = newStudent(name, className);
    setSessionId(rec.id);
    setSavedSession(rec);
    setStudent(rec);
    setSlideIndexState(0);
    setSyncState("saving");
    try {
      await saveProgress(rec, info.mode);
      setSyncState("saved");
    } catch {
      setSyncState("error");
    }
  };

  const resumeSaved = () => {
    if (!savedSession) return;
    setStudent(savedSession);
    setSlideIndexState(savedSession.currentSlide || 0);
  };

  const switchStudent = () => {
    setSessionId(null);
    setSavedSession(null);
    setStudent(null);
    setSlideIndexState(0);
  };

  const setSlideIndex = (n: number) => {
    setSlideIndexState(n);
    setStudent((prev) => {
      if (!prev) return prev;
      const slidesVisited = Array.from(new Set([...(prev.slidesVisited || []), n]));
      const next: StudentRecord = {
        ...prev,
        currentSlide: n,
        maxSlide: Math.max(prev.maxSlide, n),
        slidesVisited,
        updatedAt: new Date().toISOString(),
      };
      flushProgress(next);
      return next;
    });
  };

  const saveAnswer = (key: string, value: string) => {
    setStudent((prev) => {
      if (!prev) return prev;
      if (prev.answers[key] === value) return prev;
      const next: StudentRecord = {
        ...prev,
        answers: { ...prev.answers, [key]: value },
        updatedAt: new Date().toISOString(),
      };
      dirtyAnswers.current[key] = value;
      flushAnswers(next.id);
      flushProgress(next);
      return next;
    });
  };

  const markCompleted = (score: number) => {
    setStudent((prev) => {
      if (!prev) return prev;
      const next: StudentRecord = {
        ...prev,
        quizScore: score,
        quizTotal: QUIZ_TOTAL,
        completed: true,
        updatedAt: new Date().toISOString(),
        answers: { ...prev.answers, quiz_score: String(score) },
      };
      dirtyAnswers.current.quiz_score = String(score);
      flushAnswers(next.id);
      flushProgress(next);
      return next;
    });
  };

  const clearQuiz = () => {
    setStudent((prev) => {
      if (!prev) return prev;
      const answers = { ...prev.answers };
      Object.keys(answers).forEach((k) => {
        if (k.startsWith("quiz_")) {
          answers[k] = "";
          dirtyAnswers.current[k] = "";
        }
      });
      const next: StudentRecord = {
        ...prev,
        answers,
        quizScore: null,
        completed: false,
        updatedAt: new Date().toISOString(),
      };
      flushAnswers(next.id);
      flushProgress(next);
      return next;
    });
  };

  const loginTeacher = async (pin: string) => {
    const info = await detectHealth(true);
    modeRef.current = info.mode;
    setHealth(info);
    const result = await teacherLogin(pin, info.mode === "cloud" ? "cloud" : "local");
    if (result.ok) setTeacherAuthed(true);
    return { ok: result.ok, error: result.error };
  };

  const logoutTeacher = () => {
    clearTeacherToken();
    setTeacherAuthed(false);
  };

  const reloadStudents = () => listStudents(modeRef.current === "cloud" ? "cloud" : "local");

  const value = useMemo<LessonContextValue>(
    () => ({
      health,
      refreshHealth: async () => {
        await applyHealth(true);
      },
      student,
      answers: student?.answers || {},
      savedSession,
      startStudent,
      resumeSaved,
      switchStudent,
      slideIndex,
      setSlideIndex,
      saveAnswer,
      markCompleted,
      clearQuiz,
      syncState,
      view,
      setView,
      teacherAuthed,
      loginTeacher,
      logoutTeacher,
      reloadStudents,
    }),
    // الدوال مستقرة بما يكفي لهذه الواجهة؛ الحالة المتغيرة مضمّنة
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [health, student, savedSession, slideIndex, syncState, view, teacherAuthed]
  );

  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}
