"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { ADMIN_WHATSAPP } from "@/lib/site-data";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm Yaazhi from Yaazh Cabs. Ask me about fares, routes, vehicles or tour packages — or tap Chat on WhatsApp to reach our team.",
};

const SUGGESTIONS = [
  "Fare for Udumalpet to Coimbatore?",
  "Which vehicle for 6 people?",
  "Do you do Ooty tour packages?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (text: string) => {
    const clean = text.trim().slice(0, 500);
    if (!clean || loading) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data.reply ??
            data.error ??
            "Something went wrong. Please tap Chat on WhatsApp and we'll help right away.",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network issue. Please try again or message us on WhatsApp." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-5 right-5 z-[80] grid size-14 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-primary-foreground shadow-lg gold-ring"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-24 z-[80] flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[380px]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-[image:var(--gradient-gold)] font-display text-sm font-bold text-primary-foreground">
                Y
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">Yaazhi assistant</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Usually replies instantly</p>
              </div>
            </div>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent("Hi Yaazh Cabs, I need help with a booking.")}`}
              target="_blank"
              rel="noopener"
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary"
            >
              WhatsApp
            </a>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-primary/15 text-foreground"
                    : "bg-surface-2/60 text-muted-foreground",
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Yaazhi is typing…
              </div>
            )}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about fares, routes, cabs…"
              aria-label="Message"
              className="w-full rounded-full border border-border bg-surface-2/40 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-primary-foreground disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
