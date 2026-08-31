"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hola, soy el asistente de IA de CAP Consultor. Te puedo ayudar con dudas sobre nuestros servicios de comercio electrónico, automatización, software, marketing, gestión y consultoría tecnológica. ¿En qué estás pensando?",
};

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const k = "cap_session_id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem(k, v);
  }
  return v;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en el servidor");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e.message || "Error de red");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Disculpa, ha habido un problema. Puedes escribirnos a contact@capconsultor.eu o llamarnos al +34 669 802 256.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const suggestions = [
    "¿Qué servicios ofrecéis?",
    "Quiero automatizar mi contabilidad",
    "Tengo una pyme, ¿cómo me ayudáis?",
    "Pedir llamada gratuita",
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 py-4 px-1"
      >
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <div className="flex gap-1.5 px-3 py-2 w-fit">
            <span className="typing-dot w-2 h-2 rounded-full bg-neutral-400" />
            <span className="typing-dot w-2 h-2 rounded-full bg-neutral-400" />
            <span className="typing-dot w-2 h-2 rounded-full bg-neutral-400" />
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div className="shrink-0 flex flex-wrap gap-2 mb-3 px-1">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-neutral-200 text-neutral-700 hover:border-capblue hover:text-capblue transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="shrink-0 text-xs text-red-600 mb-2 px-1">{error}</p>}

      <div className="shrink-0 border border-neutral-200 rounded-2xl bg-white shadow-sm focus-within:border-capblue transition">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe tu mensaje…"
          rows={2}
          className="w-full resize-none px-4 py-3 bg-transparent text-sm text-black placeholder-neutral-400 focus:outline-none rounded-2xl"
        />
        <div className="flex justify-between items-center px-3 pb-2">
          <span className="text-[10px] text-neutral-400">Enter para enviar · Shift+Enter salto</span>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-capblue text-white hover:bg-capblue-dark disabled:bg-neutral-300 disabled:cursor-not-allowed transition"
          >
            Enviar
          </button>
        </div>
      </div>

      {/* El saludo ya dice que es una IA, pero desaparece al hacer scroll. Este
          aviso queda siempre visible y recuerda además que no se deben escribir
          datos sensibles, en linea con la Politica de Privacidad. */}
      <p className="shrink-0 mt-2 px-1 text-[10px] leading-snug text-neutral-400">
        Asistente de IA. Puede cometer errores; no introduzcas datos personales
        sensibles ni información confidencial.
      </p>
    </div>
  );
}

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[80%] bg-capblue text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm whitespace-pre-wrap"
            : "max-w-[85%] bg-neutral-100 text-black rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm whitespace-pre-wrap"
        }
      >
        {content}
      </div>
    </div>
  );
}
