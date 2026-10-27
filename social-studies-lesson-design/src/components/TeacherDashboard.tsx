import { useEffect, useMemo, useState } from "react";
import { useLesson } from "../context/LessonContext";
import {
  ANSWER_FIELDS,
  IMAM_NAMES,
  NARRATION_SOUNDS,
  QUESTIONS,
  SFX_SOUNDS,
  SLIDE_TITLES,
  arNum,
  formatWhen,
  progressPercent,
  timeAgo,
} from "../data/lesson";
import type { StudentRecord } from "../utils/backend";
import { deleteStudent, hasCustomLocalPin, removeSound, resetStudents, setLocalPin, uploadSound } from "../utils/backend";
import { hasCustomSound, isMuted, onSoundsChanged, playDefaultSfx, previewSound, setMuted, setVolume, getVolume } from "../utils/audio";

type Tab = "students" | "sounds" | "setup";

export function TeacherDashboard() {
  const { health, teacherAuthed, loginTeacher, logoutTeacher, setView, reloadStudents, refreshHealth } = useLesson();
  const [tab, setTab] = useState<Tab>("students");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [busy, setBusy] = useState(false);

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPinError("");
    const res = await loginTeacher(pin);
    setBusy(false);
    if (!res.ok) setPinError(res.error || "تعذر الدخول");
  };

  if (!teacherAuthed) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <button onClick={() => setView("lesson")} className="mb-4 font-extrabold text-teal-800">
          → العودة للدرس
        </button>
        <div className="rounded-3xl border-2 border-teal-100 bg-white p-8 shadow-xl">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-800 text-3xl text-white">🔐</div>
          <h1 className="text-3xl font-black text-teal-950">لوحة المعلم</h1>
          <p className="mt-2 font-semibold text-slate-600">متابعة أسماء الطلاب وتقدّمهم وإجابات الأنشطة والاختبار.</p>
          <div className="mt-4">
            <StatusLine healthMode={health.mode} />
          </div>
          <details className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-4">
            <summary className="cursor-pointer font-extrabold text-teal-900">كيف أربط Vercel وقاعدة Neon؟</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pr-5 text-sm font-semibold text-teal-950">
              <li>أنشئ مشروعاً في neon.tech وانسخ رابط الاتصال.</li>
              <li>انشر هذا المشروع على vercel.com.</li>
              <li>أضف المتغيرين DATABASE_URL و TEACHER_PIN في Environment Variables.</li>
              <li>أعد النشر، ثم ادخل لوحة المعلم بنفس TEACHER_PIN.</li>
            </ol>
          </details>
          {health.mode === "cloud" && !health.pinFromEnv ? (
            <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">
              لوحة السحابة مقفلة حتى تضيف المتغير <span className="rounded bg-white px-1">TEACHER_PIN</span> في إعدادات Vercel ثم تعيد النشر.
            </div>
          ) : (
            <form onSubmit={submitPin} className="mt-6 space-y-3">
              <label className="block font-extrabold text-slate-700">رمز دخول المعلم</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold focus:border-teal-500 focus:outline-none"
                placeholder={health.mode === "cloud" ? "الرمز الذي عيّنته في Vercel" : "رمز التجربة: 1234"}
                autoFocus
              />
              {health.mode !== "cloud" && !hasCustomLocalPin() && (
                <p className="text-sm font-bold text-teal-700">وضع التجربة على هذا الجهاز — الرمز الافتراضي: 1234</p>
              )}
              {pinError && <p className="font-bold text-rose-600">{pinError}</p>}
              <button disabled={busy} className="w-full rounded-xl bg-teal-800 py-3 font-black text-white hover:bg-teal-900 disabled:opacity-60">
                {busy ? "جاري التحقق…" : "دخول"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl py-4">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-teal-700">متابعة الصف</p>
          <h1 className="text-3xl font-black text-teal-950">لوحة المعلم</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setView("lesson")} className="rounded-xl border-2 border-teal-200 bg-white px-4 py-2 font-extrabold text-teal-800">
            → الدرس
          </button>
          <button onClick={logoutTeacher} className="rounded-xl bg-slate-800 px-4 py-2 font-extrabold text-white">
            خروج
          </button>
        </div>
      </div>
      <StatusLine healthMode={health.mode} />
      <div className="mt-4 mb-5 flex flex-wrap gap-2">
        {(
          [
            ["students", "👨‍🎓 الطلاب"],
            ["sounds", "🔊 الأصوات"],
            ["setup", "☁️ النشر والإعداد"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-5 py-2 font-extrabold ${tab === id ? "bg-rose-700 text-white shadow" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "students" && <StudentsTab reloadStudents={reloadStudents} mode={health.mode} />}
      {tab === "sounds" && <SoundsTab mode={health.mode} />}
      {tab === "setup" && <SetupTab mode={health.mode} onRefresh={refreshHealth} />}
    </div>
  );
}

function StatusLine({ healthMode }: { healthMode: string }) {
  const map: Record<string, { cls: string; text: string }> = {
    cloud: { cls: "bg-teal-50 border-teal-300 text-teal-900", text: "☁️ متصل بقاعدة Neon — بيانات كل الأجهزة تظهر هنا" },
    unconfigured: { cls: "bg-amber-50 border-amber-300 text-amber-900", text: "⚠️ الخادم يعمل لكن DATABASE_URL غير مضبوط — البيانات محلية مؤقتاً" },
    local: { cls: "bg-slate-50 border-slate-300 text-slate-700", text: "💻 وضع التجربة على هذا الجهاز. بعد النشر على Vercel مع Neon تُجمع إجابات كل الطلاب." },
  };
  const s = map[healthMode] || map.local;
  return <div className={`rounded-2xl border px-4 py-3 font-bold ${s.cls}`}>{s.text}</div>;
}

function StudentsTab({ reloadStudents, mode }: { reloadStudents: () => Promise<StudentRecord[]>; mode: string }) {
  const [rows, setRows] = useState<StudentRecord[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [klass, setKlass] = useState("الكل");
  const [sort, setSort] = useState<"new" | "name" | "progress" | "score">("new");
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const list = await reloadStudents();
      setRows(list);
      setError("");
      setSelected((cur) => (cur ? list.find((s) => s.id === cur.id) || null : null));
    } catch (e) {
      setError(e instanceof Error && e.message === "UNAUTHORIZED" ? "انتهت الجلسة، أعد الدخول" : "تعذر تحميل الطلاب");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 6000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const classes = useMemo(() => ["الكل", ...Array.from(new Set(rows.map((r) => r.className).filter(Boolean)))], [rows]);

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      const hay = `${r.name} ${r.className}`.includes(q.trim());
      const klassOk = klass === "الكل" || r.className === klass;
      return hay && klassOk;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ar");
      if (sort === "progress") return progressPercent(b.maxSlide, b.completed) - progressPercent(a.maxSlide, a.completed);
      if (sort === "score") return (b.quizScore ?? -1) - (a.quizScore ?? -1);
      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });
    return list;
  }, [rows, q, klass, sort]);

  const done = rows.filter((r) => r.completed).length;
  const avgScore = (() => {
    const scored = rows.filter((r) => r.quizScore !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, r) => s + (r.quizScore || 0), 0) / scored.length);
  })();
  const avgProg = rows.length ? Math.round(rows.reduce((s, r) => s + progressPercent(r.maxSlide, r.completed), 0) / rows.length) : 0;

  const remove = async (id: string) => {
    if (!confirm("حذف بيانات هذا الطالب؟")) return;
    await deleteStudent(id, mode === "cloud" ? "cloud" : "local");
    if (selected?.id === id) setSelected(null);
    load();
  };

  const exportCsv = () => {
    const headers = ["الاسم", "الشعبة", "التقدم٪", "الشريحة", "الاختبار", "مكتمل", "آخر تحديث", ...ANSWER_FIELDS.map((f) => f.label), ...QUESTIONS.map((_, i) => `سؤال ${i + 1}`)];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      const cells = [
        r.name,
        r.className,
        String(progressPercent(r.maxSlide, r.completed)),
        SLIDE_TITLES[r.currentSlide]?.title || "",
        r.quizScore === null ? "" : `${r.quizScore}/${r.quizTotal}`,
        r.completed ? "نعم" : "لا",
        formatWhen(r.updatedAt),
        ...ANSWER_FIELDS.map((f) => r.answers[f.key] || ""),
        ...QUESTIONS.map((qq, i) => {
          const sel = r.answers[`quiz_q${i}`];
          if (sel === undefined || sel === "") return "";
          return qq.options[Number(sel)] || "";
        }),
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "متابعة-الدرس.csv";
    a.click();
  };

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon="👥" label="عدد الطلاب" value={arNum(rows.length)} />
        <Stat icon="🏁" label="أنهوا الدرس" value={arNum(done)} />
        <Stat icon="📈" label="متوسط التقدم" value={`${arNum(avgProg)}٪`} />
        <Stat icon="⭐" label="متوسط الاختبار" value={avgScore === null ? "—" : `${arNum(avgScore)}/٨`} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالاسم…"
          className="min-w-48 flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 font-bold focus:border-teal-500 focus:outline-none"
        />
        <select value={klass} onChange={(e) => setKlass(e.target.value)} className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 font-bold">
          {classes.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 font-bold">
          <option value="new">الأحدث نشاطاً</option>
          <option value="name">الاسم</option>
          <option value="progress">التقدم</option>
          <option value="score">النتيجة</option>
        </select>
        <button onClick={load} className="rounded-xl bg-teal-700 px-4 py-2.5 font-extrabold text-white">تحديث</button>
        <button onClick={exportCsv} disabled={!rows.length} className="rounded-xl bg-amber-500 px-4 py-2.5 font-extrabold text-amber-950 disabled:opacity-40">
          تصدير Excel
        </button>
      </div>
      {error && <p className="mb-3 font-bold text-rose-600">{error}</p>}
      {loading ? (
        <p className="font-bold text-slate-500">جاري تحميل بيانات الطلاب…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-teal-200 bg-white p-10 text-center">
          <div className="text-5xl">📒</div>
          <h2 className="mt-3 text-2xl font-black text-teal-900">لا يوجد طلاب بعد</h2>
          <p className="mt-2 font-semibold text-slate-600">عندما يكتب الطالب اسمه في بداية الدرس سيظهر هنا مع تقدّمه وإجاباته. التحديث تلقائي كل ٦ ثوانٍ.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-12 gap-2 bg-teal-900 px-4 py-3 text-sm font-extrabold text-white md:grid">
            <div className="col-span-3">الطالب</div>
            <div className="col-span-3">التقدم</div>
            <div className="col-span-2">الشريحة</div>
            <div className="col-span-2">الاختبار</div>
            <div className="col-span-2">آخر ظهور</div>
          </div>
          {filtered.map((r) => {
            const p = progressPercent(r.maxSlide, r.completed);
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="grid w-full grid-cols-1 gap-2 border-t border-slate-100 px-4 py-3 text-right hover:bg-teal-50 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-3">
                  <p className="font-black text-slate-800">{r.name}</p>
                  <p className="text-sm font-bold text-slate-500">{r.className || "بدون شعبة"}</p>
                </div>
                <div className="md:col-span-3">
                  <div className="mb-1 flex justify-between text-xs font-extrabold text-slate-500">
                    <span>{arNum(p)}٪</span>
                    {r.completed && <span className="text-teal-700">مكتمل</span>}
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${p >= 80 ? "bg-teal-600" : p >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${p}%` }} />
                  </div>
                </div>
                <div className="font-bold text-slate-700 md:col-span-2">{SLIDE_TITLES[r.currentSlide]?.title}</div>
                <div className="font-black text-teal-800 md:col-span-2">{r.quizScore === null ? "لم يبدأ" : `${arNum(r.quizScore)}/${arNum(r.quizTotal)}`}</div>
                <div className="text-sm font-bold text-slate-500 md:col-span-2">{timeAgo(r.updatedAt)}</div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-teal-950/50 p-0 md:items-center md:p-6" onClick={() => setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-teal-950">{selected.name}</h2>
                <p className="font-bold text-slate-500">
                  {selected.className || "بدون شعبة"} • بدأ {formatWhen(selected.createdAt)} • آخر تحديث {formatWhen(selected.updatedAt)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full bg-slate-100 px-3 py-1 font-black">✕</button>
            </div>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {SLIDE_TITLES.map((s, i) => {
                const visited = selected.slidesVisited?.includes(i) || i <= selected.maxSlide;
                const current = i === selected.currentSlide;
                return (
                  <span
                    key={s.title}
                    title={s.title}
                    className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${current ? "bg-rose-700 text-white" : visited ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-400"}`}
                  >
                    {s.icon} {arNum(i + 1)}
                  </span>
                );
              })}
            </div>
            <h3 className="mb-2 font-black text-rose-800">إجابات الأنشطة</h3>
            <div className="mb-5 space-y-2">
              {ANSWER_FIELDS.map((f) => (
                <div key={f.key} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-extrabold text-teal-800">{f.label}</p>
                  <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-700">{displayAnswer(f.key, selected.answers[f.key])}</p>
                </div>
              ))}
            </div>
            <h3 className="mb-2 font-black text-rose-800">الاختبار</h3>
            <div className="space-y-2">
              {QUESTIONS.map((qq, i) => {
                const raw = selected.answers[`quiz_q${i}`];
                const sel = raw === undefined || raw === "" ? null : Number(raw);
                const ok = sel === qq.answer;
                return (
                  <div key={qq.q} className={`rounded-xl border p-3 ${sel === null ? "border-slate-200" : ok ? "border-teal-300 bg-teal-50" : "border-rose-300 bg-rose-50"}`}>
                    <p className="font-extrabold text-slate-800">
                      {arNum(i + 1)}. {qq.q}
                    </p>
                    <p className="mt-1 font-bold">
                      {sel === null ? "لم يُجب" : `${ok ? "✅" : "❌"} إجابته: ${qq.options[sel] || "—"}`}
                      {sel !== null && !ok && <span className="text-teal-800"> • الصحيح: {qq.options[qq.answer]}</span>}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => remove(selected.id)} className="rounded-xl bg-rose-700 px-4 py-2 font-extrabold text-white">
                حذف الطالب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function displayAnswer(key: string, value?: string) {
  if (!value) return "لم يُجب بعد";
  if (key === "timeline_done") return value;
  if (key === "hook_revealed") return value === "1" || value === "نعم" ? "كشف الإجابة" : value;
  if (value.startsWith("[")) {
    try {
      const arr = JSON.parse(value);
      if (key === "timeline_placed" && Array.isArray(arr)) {
        return arr.map((n: number | null, i: number) => `${i + 1}. ${n === null ? "فارغ" : IMAM_NAMES[n]}`).join(" — ");
      }
    } catch {}
  }
  return value;
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <p className="mt-1 text-2xl font-black text-teal-900">{value}</p>
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}

function SoundsTab({ mode }: { mode: string }) {
  const [, bump] = useState(0);
  const [msg, setMsg] = useState("");
  const [vol, setVol] = useState(getVolume());
  useEffect(() => onSoundsChanged(() => bump((n) => n + 1)), []);

  const onFile = async (key: string, file?: File) => {
    if (!file) return;
    setMsg("");
    try {
      await uploadSound(key, file, mode === "cloud" ? "cloud" : "local");
      setMsg(mode === "cloud" ? "تم رفع الملف وسيسمعه جميع الطلاب" : "تم حفظ الملف على هذا الجهاز");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "تعذر الرفع");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-teal-950">استبدال الأصوات بملفاتك</h2>
        <p className="mt-1 font-semibold text-slate-600">
          ارفع mp3 أو wav أو m4a (الحد 1.5 ميغابايت). إن لم ترفع ملفاً يُستخدم الصوت الافتراضي أو القراءة الآلية. يمكنك أيضاً وضع الملفات في مجلد <span className="font-black">public/sounds</span> بالاسم نفسه مثل <span className="font-black">correct.mp3</span> و<span className="font-black">narr-0.mp3</span> ثم إعادة النشر.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="font-extrabold text-slate-700">
            مستوى الصوت
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVol(v);
                setVolume(v);
              }}
              className="mr-3 align-middle"
            />
          </label>
          <button
            onClick={() => {
              setMuted(!isMuted());
              bump((n) => n + 1);
            }}
            className="rounded-xl border border-slate-300 px-4 py-2 font-extrabold"
          >
            {isMuted() ? "🔇 الأصوات متوقفة" : "🔊 الأصوات تعمل"}
          </button>
        </div>
        {msg && <p className="mt-3 font-bold text-teal-800">{msg}</p>}
      </div>
      <section>
        <h3 className="mb-3 text-lg font-black text-rose-800">المؤثرات الصوتية</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {SFX_SOUNDS.map((s) => (
            <SoundRow key={s.key} soundKey={s.key} label={s.label} hint={s.hint} onFile={onFile} onRemove={() => removeSound(s.key, mode === "cloud" ? "cloud" : "local")} />
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-lg font-black text-rose-800">التعليق الصوتي لكل شريحة</h3>
        <p className="mb-3 font-semibold text-slate-600">عند رفع ملف، يحل محل زر «استمع للشرح» في تلك الشريحة بدلاً من القراءة الآلية.</p>
        <div className="space-y-3">
          {NARRATION_SOUNDS.map((s) => (
            <SoundRow key={s.key} soundKey={s.key} label={s.label} onFile={onFile} onRemove={() => removeSound(s.key, mode === "cloud" ? "cloud" : "local")} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SoundRow({
  soundKey,
  label,
  hint,
  onFile,
  onRemove,
}: {
  soundKey: string;
  label: string;
  hint?: string;
  onFile: (key: string, file?: File) => void;
  onRemove: () => void;
}) {
  const custom = hasCustomSound(soundKey);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <p className="font-extrabold text-slate-800">{label}</p>
        <p className="text-sm font-semibold text-slate-500">
          {custom ? "ملف خاص مفعّل" : "الصوت الافتراضي"}
          {hint ? ` • ${hint}` : ""} • {soundKey}.mp3
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => (custom ? previewSound(soundKey) : playDefaultSfx(soundKey))}
          className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-extrabold text-teal-800"
        >
          ▶ تجربة
        </button>
        <label className="cursor-pointer rounded-lg bg-amber-400 px-3 py-2 text-sm font-extrabold text-amber-950">
          رفع ملف
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              onFile(soundKey, e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {custom && (
          <button onClick={onRemove} className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-extrabold text-rose-700">
            حذف
          </button>
        )}
      </div>
    </div>
  );
}

function SetupTab({ mode, onRefresh }: { mode: string; onRefresh: () => Promise<void> }) {
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState("");

  const savePin = async () => {
    if (pin1.length < 4) return setNote("الرمز ٤ أحرف على الأقل");
    if (pin1 !== pin2) return setNote("الرمزان غير متطابقين");
    await setLocalPin(pin1);
    setNote("تم تغيير رمز التجربة على هذا الجهاز");
    setPin1("");
    setPin2("");
  };

  const wipe = async () => {
    if (confirm !== "حذف") return setNote("اكتب كلمة حذف للتأكيد");
    await resetStudents(mode === "cloud" ? "cloud" : "local");
    setConfirm("");
    setNote("تم حذف بيانات الطلاب");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-teal-950">النشر على Vercel مع Neon</h2>
        <ol className="mt-3 list-decimal space-y-2 pr-5 font-semibold text-slate-700">
          <li>أنشئ قاعدة مجانية في neon.tech وانسخ رابط الاتصال (Connection string).</li>
          <li>ارفع المشروع إلى GitHub ثم استورده في vercel.com، أو نفّذ من المجلد: npx vercel</li>
          <li>
            في Vercel → Settings → Environment Variables أضف:
            <div className="mt-2 rounded-xl bg-slate-900 p-3 font-mono text-sm text-amber-200" dir="ltr">
              DATABASE_URL=postgresql://...
              <br />
              TEACHER_PIN=رمز_سري
            </div>
          </li>
          <li>أو من لوحة Vercel اختر تكامل Neon ليُضاف DATABASE_URL تلقائياً، ثم أضف TEACHER_PIN بنفسك.</li>
          <li>أعد النشر. افتح لوحة المعلم وتأكد أن الشارة تقول «متصل بقاعدة Neon».</li>
        </ol>
        <button onClick={() => onRefresh()} className="mt-4 rounded-xl bg-teal-800 px-4 py-2 font-extrabold text-white">
          فحص الاتصال الآن
        </button>
        <p className="mt-3 text-sm font-bold text-slate-500">الحالة الحالية: {mode === "cloud" ? "متصل" : mode === "unconfigured" ? "بدون قاعدة" : "تجربة محلية"}</p>
      </div>
      <div className="space-y-4">
        {mode !== "cloud" && (
          <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-amber-900">رمز لوحة التجربة</h2>
            <p className="mt-1 font-semibold text-slate-600">يخص هذا المتصفح فقط. على Vercel يُستخدم TEACHER_PIN.</p>
            <input value={pin1} onChange={(e) => setPin1(e.target.value)} type="password" placeholder="رمز جديد" className="mt-3 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold" />
            <input value={pin2} onChange={(e) => setPin2(e.target.value)} type="password" placeholder="تأكيد الرمز" className="mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold" />
            <button onClick={savePin} className="mt-3 rounded-xl bg-amber-400 px-4 py-2 font-extrabold text-amber-950">حفظ الرمز</button>
          </div>
        )}
        <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-rose-800">حذف بيانات الطلاب</h2>
          <p className="mt-1 font-semibold text-slate-600">يمسح الأسماء والتقدم والإجابات. لا يحذف ملفات الصوت.</p>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='اكتب "حذف" للتأكيد' className="mt-3 w-full rounded-xl border-2 border-rose-200 px-3 py-2 font-bold" />
          <button onClick={wipe} className="mt-3 rounded-xl bg-rose-700 px-4 py-2 font-extrabold text-white">مسح الكل</button>
          {note && <p className="mt-3 font-bold text-slate-700">{note}</p>}
        </div>
      </div>
    </div>
  );
}
