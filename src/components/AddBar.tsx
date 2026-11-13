"use client";

import { useRef, useState } from "react";
import { useLang, useT } from "./LangProvider";
import { Mic, Plus } from "lucide-react";
import { useBoard } from "./board/BoardProvider";

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


/**
 * The one add box. It clears the moment you press Return and stays ready for the next entry
 * (the save runs in the background, one after the other; plain items show up at once) — so
 * typing fast never glues two entries together or loses one.
 */
export function AddBar() {
  const tr = useT();
  const lang = useLang();
  const { addText } = useBoard();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [listening, setListening] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // The quantity field is just a prefix — the parser turns "2kg potatoes",
  // "1L milk", "x3 eggs" into the right qty + unit.
  function submitText(value: string, clear: boolean) {
    const text = value.trim();
    if (!text) return;
    addText(text);
    if (clear) {
      setName("");
      setQty("");
      nameRef.current?.focus();
    }
  }

  function submitFields() {
    const n = name.trim();
    if (!n) return;
    const q = qty.trim();
    submitText(q ? `${q} ${n}` : n, true);
  }

  function startVoice() {
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.lang = lang === "pt" ? "pt-PT" : "en-GB";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) submitText(transcript, false);
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
      className="sticky top-[3.75rem] z-20 flex items-center gap-1 rounded-2xl border border-hairline bg-surface p-1 shadow-sm"
    >
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        enterKeyHint="done"
        placeholder={tr("addPlaceholder")}
        aria-label={tr("itemName")}
        className="h-11 min-w-0 flex-1 bg-transparent px-3 text-fg outline-none placeholder:text-muted"
      />
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        enterKeyHint="done"
        placeholder="2kg"
        aria-label={tr("quantity")}
        className="h-11 w-16 shrink-0 rounded-xl bg-surface-2 px-2 text-center text-sm text-fg outline-none placeholder:text-muted"
      />
      <button
        type="button"
        onClick={startVoice}
        aria-label={tr("addByVoice")}
        className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${
          listening ? "bg-over/15 text-over" : "text-muted hover:bg-surface-2 hover:text-fg"
        }`}
      >
        <Mic className="size-5" />
      </button>
      <button
        type="submit"
        disabled={!name.trim()}
        // keep the focus (and the iPhone keyboard) in the field
        onMouseDown={(e) => e.preventDefault()}
        aria-label={tr("add")}
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-on-brand transition-opacity disabled:opacity-40"
      >
        <Plus className="size-5" strokeWidth={2.6} />
      </button>
    </form>
  );
}
