import { api } from "./api";

const SPEAK_KEY = "lifeos_speak_replies";

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionErrorEvent = Event & { error: string };

function speechCtor(): (new () => SpeechRec) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function recorderMime(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "audio/webm";
}

export function getSpeakReplies(): boolean {
  try {
    return localStorage.getItem(SPEAK_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSpeakReplies(on: boolean) {
  try {
    localStorage.setItem(SPEAK_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function speakableText(markdown: string): string {
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#+\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 700 ? `${cleaned.slice(0, 680).trim()}…` : cleaned;
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function isSpeaking(): boolean {
  try {
    return Boolean(window.speechSynthesis?.speaking);
  } catch {
    return false;
  }
}

export function speakReply(markdown: string) {
  if (!getSpeakReplies()) return;
  const text = speakableText(markdown);
  if (!text || typeof window.speechSynthesis === "undefined") return;
  stopSpeaking();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.02;
  utter.pitch = 1;
  utter.lang = navigator.language || "en-US";
  window.speechSynthesis.speak(utter);
}

type Session = {
  mode: "speech" | "record";
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  recognition: SpeechRec | null;
  transcript: string;
  committed: string;
  keepAlive: boolean;
  onPartial: (text: string) => void;
};

let active: Session | null = null;

export type VoiceStatus = "idle" | "listening" | "transcribing";

function resultText(ev: SpeechRecognitionEvent): string {
  let text = "";
  for (let i = 0; i < ev.results.length; i++) {
    text += ev.results[i][0].transcript;
  }
  return text.trim();
}

function attachRecognition(session: Session, rec: SpeechRec) {
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.lang = navigator.language || "en-US";
  rec.onresult = (ev) => {
    if (active !== session) return;
    const piece = resultText(ev);
    const next = `${session.committed} ${piece}`.replace(/\s+/g, " ").trim();
    session.transcript = next;
    session.onPartial(next);
  };
  rec.onerror = (ev) => {
    if (active !== session) return;
    if (ev.error === "no-speech" || ev.error === "aborted") return;
    if (session.mode === "speech" && (ev.error === "network" || ev.error === "audio-capture" || ev.error === "not-allowed")) {
      void fallbackToRecording(session);
    }
  };
  rec.onend = () => {
    if (active !== session || !session.keepAlive || session.mode !== "speech") return;
    session.committed = session.transcript;
    try {
      rec.start();
    } catch {
      /* already started */
    }
  };
}

async function fallbackToRecording(session: Session) {
  if (active !== session || session.mode === "record") return;
  session.keepAlive = false;
  try {
    session.recognition?.abort();
  } catch {
    /* ignore */
  }
  session.recognition = null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    if (active !== session) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const mime = recorderMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = (ev) => {
      if (ev.data.size) session.chunks.push(ev.data);
    };
    recorder.start(200);
    session.mode = "record";
    session.stream = stream;
    session.recorder = recorder;
  } catch {
    /* live captions unavailable */
  }
}

export async function startVoiceListen(onPartial: (text: string) => void): Promise<void> {
  stopSpeaking();
  await stopVoiceListen(true);

  const session: Session = {
    mode: "speech",
    stream: null,
    recorder: null,
    chunks: [],
    recognition: null,
    transcript: "",
    committed: "",
    keepAlive: true,
    onPartial,
  };
  active = session;

  const Ctor = speechCtor();
  if (Ctor) {
    try {
      const recognition = new Ctor();
      session.recognition = recognition;
      attachRecognition(session, recognition);
      recognition.start();
      return;
    } catch {
      session.recognition = null;
    }
  }

  await fallbackToRecording(session);
}

export async function stopVoiceListen(discard = false): Promise<string> {
  const session = active;
  active = null;
  if (!session) return "";

  session.keepAlive = false;
  const live = session.transcript.trim();
  try {
    session.recognition?.stop();
  } catch {
    try {
      session.recognition?.abort();
    } catch {
      /* ignore */
    }
  }

  let blob: Blob | null = null;
  if (session.recorder) {
    blob = await new Promise<Blob>((resolve) => {
      if (session.recorder!.state === "inactive") {
        resolve(new Blob(session.chunks, { type: session.recorder!.mimeType || "audio/webm" }));
        return;
      }
      session.recorder!.onstop = () => {
        resolve(new Blob(session.chunks, { type: session.recorder!.mimeType || "audio/webm" }));
      };
      try {
        session.recorder!.stop();
      } catch {
        resolve(new Blob(session.chunks, { type: session.recorder!.mimeType || "audio/webm" }));
      }
    });
  }
  session.stream?.getTracks().forEach((track) => track.stop());
  if (discard) return "";
  if (live.split(/\s+/).filter(Boolean).length >= 1) return live;
  if (!blob?.size) return live;

  const type = blob.type || "audio/webm";
  const filename = type.includes("mp4") ? "voice.m4a" : "voice.webm";
  const { text } = await api.chatTranscribe(blob, filename);
  return text.trim();
}
