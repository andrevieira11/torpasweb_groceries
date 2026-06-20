"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mic, Plus } from "lucide-react";
import { addItems } from "@/lib/actions/items";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechResultLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function AddBar({ listId }: { listId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addItems({ listId, text: trimmed });
      setText("");
      router.refresh();
      inputRef.current?.focus();
    });
  }

  function startVoice() {
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) submit(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(text);
      }}
      className="sticky top-[3.5rem] z-20 flex items-center gap-2 rounded-2xl border border-hairline bg-surface p-1.5 shadow-sm"
    >
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        enterKeyHint="done"
        placeholder="Add — e.g. milk, 2kg potatoes, bananas"
        aria-label="Add items"
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-fg outline-none placeholder:text-muted"
      />
      <button
        type="button"
        onClick={startVoice}
        aria-label="Add by voice"
        className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors ${
          listening ? "bg-over/15 text-over" : "text-muted hover:bg-surface-2 hover:text-fg"
        }`}
      >
        <Mic className="size-5" />
      </button>
      <button
        type="submit"
        disabled={pending || !text.trim()}
        aria-label="Add"
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white transition-opacity disabled:opacity-40"
      >
        <Plus className="size-5" strokeWidth={2.6} />
      </button>
    </form>
  );
}
