// مؤثرات افتراضية (Web Audio) + ملفات المعلم + تعليق صوتي
let ctx: AudioContext | null = null;
const urls = new Map<string, string>();
const listeners = new Set<() => void>();
let narrAudio: HTMLAudioElement | null = null;
let muted = false;
let volume = 0.9;

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem("diriyah_muted") === "1";
    const v = Number(localStorage.getItem("diriyah_volume"));
    if (!Number.isNaN(v) && v >= 0 && v <= 1) volume = v;
  } catch {}
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function onSoundsChanged(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function hasCustomSound(key: string) {
  return urls.has(key);
}

export function registerSound(key: string, blob: Blob) {
  const prev = urls.get(key);
  if (prev) URL.revokeObjectURL(prev);
  urls.set(key, URL.createObjectURL(blob));
  notify();
}

export function unregisterSound(key: string) {
  const prev = urls.get(key);
  if (prev) URL.revokeObjectURL(prev);
  urls.delete(key);
  notify();
}

export function getVolume() {
  return volume;
}
export function isMuted() {
  return muted;
}
export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem("diriyah_volume", String(volume));
  } catch {}
  if (narrAudio) narrAudio.volume = volume;
}
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("diriyah_muted", m ? "1" : "0");
  } catch {}
  if (m) stopSpeaking();
  notify();
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", vol = 0.2) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume * vol, ac.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

function playSfx(key: string, fallback: () => void) {
  if (muted) return;
  const url = urls.get(key);
  if (!url) {
    fallback();
    return;
  }
  const a = new Audio(url);
  a.volume = volume;
  a.play().catch(() => fallback());
}

export function playClick() {
  playSfx("click", () => {
    try {
      tone(650, 0, 0.08, "triangle", 0.15);
      tone(900, 0.04, 0.08, "triangle", 0.1);
    } catch {}
  });
}
export function playFlip() {
  playSfx("flip", () => {
    try {
      tone(420, 0, 0.1, "sine", 0.15);
      tone(620, 0.07, 0.12, "sine", 0.15);
    } catch {}
  });
}
export function playCorrect() {
  playSfx("correct", () => {
    try {
      tone(523.25, 0, 0.15, "sine", 0.22);
      tone(659.25, 0.12, 0.15, "sine", 0.22);
      tone(783.99, 0.24, 0.3, "sine", 0.22);
    } catch {}
  });
}
export function playWrong() {
  playSfx("wrong", () => {
    try {
      tone(220, 0, 0.2, "sawtooth", 0.12);
      tone(175, 0.18, 0.3, "sawtooth", 0.12);
    } catch {}
  });
}
export function playSuccess() {
  playSfx("success", () => {
    try {
      [523.25, 587.33, 659.25, 783.99, 880, 1046.5].forEach((n, i) => tone(n, i * 0.1, 0.25, "sine", 0.2));
      tone(1318.5, 0.65, 0.5, "sine", 0.18);
    } catch {}
  });
}
export function playReveal() {
  playSfx("reveal", () => {
    try {
      tone(880, 0, 0.1, "sine", 0.15);
      tone(1174.66, 0.08, 0.18, "sine", 0.15);
    } catch {}
  });
}

export function playDefaultSfx(key: string) {
  const saved = urls.get(key);
  if (saved) urls.delete(key);
  const map: Record<string, () => void> = {
    click: playClick,
    flip: playFlip,
    correct: playCorrect,
    wrong: playWrong,
    success: playSuccess,
    reveal: playReveal,
  };
  map[key]?.();
  if (saved) urls.set(key, saved);
}

export function previewSound(key: string) {
  const url = urls.get(key);
  if (!url) return false;
  stopSpeaking();
  narrAudio = new Audio(url);
  narrAudio.volume = volume;
  narrAudio.play().catch(() => {});
  return true;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isSpeaking() {
  return currentUtterance !== null || narrAudio !== null;
}

function pickArabicVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "ar-SA") || voices.find((v) => v.lang.startsWith("ar")) || null;
}

export function speak(text: string, onEnd?: () => void) {
  if (muted) {
    onEnd?.();
    return;
  }
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    const voice = pickArabicVoice();
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.pitch = 1;
    u.onend = () => {
      currentUtterance = null;
      onEnd?.();
    };
    u.onerror = () => {
      currentUtterance = null;
      onEnd?.();
    };
    currentUtterance = u;
    synth.speak(u);
  } catch {
    onEnd?.();
  }
}

/** يشغّل ملف تعليق المعلم إن وُجد، وإلا يعيد false ليُستخدم الصوت الآلي */
export function playNarration(key: string, onEnd?: () => void) {
  if (muted) {
    onEnd?.();
    return false;
  }
  const url = urls.get(key);
  if (!url) return false;
  stopSpeaking();
  narrAudio = new Audio(url);
  narrAudio.volume = volume;
  narrAudio.onended = () => {
    narrAudio = null;
    onEnd?.();
  };
  narrAudio.onerror = () => {
    narrAudio = null;
    onEnd?.();
  };
  narrAudio.play().catch(() => {
    narrAudio = null;
    onEnd?.();
  });
  return true;
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {}
  currentUtterance = null;
  if (narrAudio) {
    narrAudio.pause();
    narrAudio.src = "";
    narrAudio = null;
  }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
