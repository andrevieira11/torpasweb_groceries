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
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [listening, setListening] = useState(false);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  // The quantity field is just a prefix — the parser turns "2kg potatoes",
  // "1L milk", "x3 eggs" into the right qty + unit.
  function submitText(value: string) {
    const text = value.trim();
    if (!text) return;
    startTransition(async () => {
      await addItems({ listId, text });
      setName("");
      setQty("");
      router.refresh();
      nameRef.current?.focus();
    });
  }

  function submitFields() {
    const n = name.trim();
    if (!n) return;
    const q = qty.trim();
    submitText(q ? `${q} ${n}` : n);
  }

  function startVoice() {
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) submitText(transcript);
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
        submitFields();
      }}
      className="sticky top-[3.5rem] z-20 flex items-center gap-1.5 rounded-2xl border border-hairline bg-surface p-1.5 shadow-sm"
    >
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        enterKeyHint="done"
        placeholder="Add item — milk, eggs…"
        aria-label="Item name"
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-fg outline-none placeholder:text-muted"
      />
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        enterKeyHint="done"
        placeholder="2kg"
        aria-label="Quantity"
        className="w-16 shrink-0 rounded-xl bg-surface-2 px-2 py-2 text-center text-sm text-fg outline-none placeholder:text-muted"
      />
      <button
        type="button"
        onClick={startVoice}
        aria-label="Add by voice"
        className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors ${
          listening ? "bg-over/15 text-over" : "text-muted hover:bg-surface-2 hover:text-fg"
        }`}
      >
        <Mic className="size-5" />
      </button>
      <button
        type="submit"
        disabled={pending || !name.trim()}
        aria-label="Add"
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white transition-opacity disabled:opacity-40"
      >
        <Plus className="size-5" strokeWidth={2.6} />
      </button>
    </form>
  );
}
