import { registerSound, unregisterSound } from "./audio";
import { NARRATION_SOUNDS, SFX_SOUNDS } from "../data/lesson";

export type StudentRecord = {
  id: string;
  name: string;
  className: string;
  currentSlide: number;
  maxSlide: number;
  slidesVisited: number[];
  quizScore: number | null;
  quizTotal: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  answers: Record<string, string>;
};

export type AppMode = "cloud" | "local" | "unconfigured";

export type HealthInfo = {
  mode: AppMode;
  pinSet: boolean;
  pinFromEnv: boolean;
  error?: string;
  message?: string;
};

const STUDENTS_KEY = "diriyah_students_v1";
const SESSION_KEY = "diriyah_session_v1";
const PIN_KEY = "diriyah_teacher_pin_v1";
const TOKEN_KEY = "diriyah_teacher_token";
const IDB_NAME = "diriyah-lesson";
const IDB_STORE = "sounds";

const ALL_SOUND_KEYS = [...SFX_SOUNDS.map((s) => s.key), ...NARRATION_SOUNDS.map((s) => s.key)];

function readStudents(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STUDENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeStudents(list: StudentRecord[]) {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(list));
}

export function getSessionId() {
  return localStorage.getItem(SESSION_KEY);
}
export function setSessionId(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

export function getLocalStudent(id: string) {
  return readStudents().find((s) => s.id === id) || null;
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`diriyah|${text}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let healthPromise: Promise<HealthInfo> | null = null;

export function detectHealth(force = false): Promise<HealthInfo> {
  if (force) healthPromise = null;
  if (!healthPromise) healthPromise = doDetect();
  return healthPromise;
}

async function doDetect(): Promise<HealthInfo> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch("/api/health", { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(t);
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("json")) return { mode: "local", pinSet: true, pinFromEnv: false };
    const data = await res.json();
    if (!data?.api) return { mode: "local", pinSet: true, pinFromEnv: false };
    if (data.database) {
      return { mode: "cloud", pinSet: Boolean(data.pinSet), pinFromEnv: Boolean(data.pinFromEnv), message: data.message, error: data.error };
    }
    return { mode: "unconfigured", pinSet: false, pinFromEnv: Boolean(data.pinFromEnv), message: data.message, error: data.error };
  } catch {
    return { mode: "local", pinSet: true, pinFromEnv: false };
  }
}

export function getTeacherToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function clearTeacherToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function teacherLogin(pin: string, mode: AppMode): Promise<{ ok: boolean; error?: string; token?: string }> {
  if (mode === "cloud") {
    const res = await fetch("/api/teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message || "رمز المعلم غير صحيح" };
    sessionStorage.setItem(TOKEN_KEY, data.token);
    return { ok: true, token: data.token };
  }
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) {
    if (pin === "1234") {
      sessionStorage.setItem(TOKEN_KEY, "local-demo");
      return { ok: true, token: "local-demo" };
    }
    return { ok: false, error: "رمز التجربة هو ١٢٣٤" };
  }
  if ((await sha256(pin)) === stored) {
    const token = crypto.randomUUID();
    sessionStorage.setItem(TOKEN_KEY, token);
    return { ok: true, token };
  }
  return { ok: false, error: "رمز المعلم غير صحيح" };
}

export async function setLocalPin(pin: string) {
  localStorage.setItem(PIN_KEY, await sha256(pin));
}
export function hasCustomLocalPin() {
  return Boolean(localStorage.getItem(PIN_KEY));
}

function upsertLocal(student: StudentRecord) {
  const list = readStudents();
  const i = list.findIndex((s) => s.id === student.id);
  if (i >= 0) list[i] = { ...list[i], ...student, answers: { ...list[i].answers, ...student.answers } };
  else list.unshift(student);
  writeStudents(list);
}

export async function fetchStudent(id: string, mode: AppMode): Promise<StudentRecord | null> {
  const local = getLocalStudent(id);
  if (mode !== "cloud") return local;
  try {
    const res = await fetch(`/api/sync?id=${encodeURIComponent(id)}`);
    if (!res.ok) return local;
    const data = await res.json();
    return data.student || local;
  } catch {
    return local;
  }
}

export async function pushLocalClassToCloud() {
  const list = readStudents();
  for (const student of list) {
    await saveProgress(student, "cloud");
    if (student.answers && Object.keys(student.answers).length) {
      await saveAnswers(student.id, student.answers, "cloud");
    }
  }
}

export async function saveProgress(student: StudentRecord, mode: AppMode) {
  upsertLocal(student);
  if (mode !== "cloud") return;
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "progress", student }),
    keepalive: true,
  });
  if (!res.ok) throw new Error("sync failed");
}

export async function saveAnswers(id: string, answers: Record<string, string>, mode: AppMode) {
  const list = readStudents();
  const i = list.findIndex((s) => s.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], answers: { ...list[i].answers, ...answers }, updatedAt: new Date().toISOString() };
    writeStudents(list);
  }
  if (mode !== "cloud") return;
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "answers", id, answers }),
    keepalive: true,
  });
  if (!res.ok) throw new Error("answers failed");
}

export async function listStudents(mode: AppMode): Promise<StudentRecord[]> {
  if (mode !== "cloud") {
    return readStudents().sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }
  const token = getTeacherToken();
  const res = await fetch("/api/teacher", { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("LIST_FAILED");
  const data = await res.json();
  return data.students || [];
}

export async function deleteStudent(id: string, mode: AppMode) {
  writeStudents(readStudents().filter((s) => s.id !== id));
  if (mode !== "cloud") return;
  const token = getTeacherToken();
  const res = await fetch("/api/teacher", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "delete", id }),
  });
  if (!res.ok) throw new Error("DELETE_FAILED");
}

export async function resetStudents(mode: AppMode) {
  writeStudents([]);
  if (mode !== "cloud") return;
  const token = getTeacherToken();
  const res = await fetch("/api/teacher", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "reset" }),
  });
  if (!res.ok) throw new Error("RESET_FAILED");
}

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: unknown) {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const r = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}
async function idbDel(key: string) {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function b64ToBlob(b64: string, mime: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || "audio/mpeg" });
}

export async function fileToBase64(file: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return dataUrl.split(",")[1] || "";
}

async function tryStatic(key: string) {
  try {
    const res = await fetch(`/sounds/${key}.mp3`);
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 80) return;
    const head = new TextDecoder().decode(buf.slice(0, 24));
    if (head.includes("<!") || head.includes("<html")) return;
    registerSound(key, new Blob([buf], { type: res.headers.get("content-type") || "audio/mpeg" }));
  } catch {}
}

export async function loadAllSounds(mode: AppMode) {
  const loaded = new Set<string>();
  try {
    for (const key of ALL_SOUND_KEYS) {
      const cached = await idbGet<{ blob: Blob }>(key);
      if (cached?.blob) {
        registerSound(key, cached.blob);
        loaded.add(key);
      }
    }
  } catch {}

  if (mode === "cloud") {
    try {
      const meta = await fetch("/api/sounds");
      if (meta.ok) {
        const data = await meta.json();
        const sounds: { key: string }[] = data.sounds || [];
        await Promise.all(
          sounds.map(async (s) => {
            const res = await fetch(`/api/sounds?key=${encodeURIComponent(s.key)}`);
            if (!res.ok) return;
            const row = await res.json();
            if (!row.data) return;
            const blob = b64ToBlob(row.data, row.mime);
            registerSound(s.key, blob);
            loaded.add(s.key);
            try {
              await idbPut(s.key, { blob, filename: row.filename, mime: row.mime });
            } catch {}
          })
        );
      }
    } catch {}
  }

  await Promise.all(ALL_SOUND_KEYS.filter((k) => !loaded.has(k)).map((k) => tryStatic(k)));
}

export async function uploadSound(key: string, file: File, mode: AppMode) {
  if (file.size > 1.5 * 1024 * 1024) throw new Error("حجم الملف أكبر من 1.5 ميغابايت");
  registerSound(key, file);
  try {
    await idbPut(key, { blob: file, filename: file.name, mime: file.type });
  } catch {}
  if (mode !== "cloud") return;
  const token = getTeacherToken();
  const data = await fileToBase64(file);
  const res = await fetch("/api/sounds", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key, filename: file.name, mime: file.type || "audio/mpeg", data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "تعذر رفع الملف إلى قاعدة البيانات");
  }
}

export async function removeSound(key: string, mode: AppMode) {
  unregisterSound(key);
  try {
    await idbDel(key);
  } catch {}
  if (mode !== "cloud") return;
  const token = getTeacherToken();
  await fetch(`/api/sounds?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function newStudent(name: string, className: string): StudentRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    className: className.trim(),
    currentSlide: 0,
    maxSlide: 0,
    slidesVisited: [0],
    quizScore: null,
    quizTotal: 8,
    completed: false,
    createdAt: now,
    updatedAt: now,
    answers: {},
  };
}
