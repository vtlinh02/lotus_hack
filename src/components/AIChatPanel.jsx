import { useState, useEffect, useRef, useCallback } from "react";
import { useOpenAI } from "../hooks/useOpenAI.js";

export function AIChatPanel({ chapter, pendingInput, onPendingInputConsumed, disabled }) {
  const { streamChat, hasKey } = useOpenAI();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (pendingInput && pendingInput.trim() !== "") {
      setInputValue(pendingInput);
      onPendingInputConsumed?.();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [pendingInput, onPendingInputConsumed]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !hasKey || disabled || isStreaming) return;

    const userMsg = {
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      role: "user",
      content: text,
      streaming: false,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsStreaming(true);

    const aiMsg = {
      id: crypto.randomUUID?.() ?? `ai-${Date.now()}`,
      role: "ai",
      content: "",
      streaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      let full = "";
      for await (const token of streamChat(history, chapter)) {
        full += token;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "ai") {
            next[next.length - 1] = { ...last, content: full, streaming: true };
          }
          return next;
        });
      }
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "ai") {
          next[next.length - 1] = { ...last, content: full, streaming: false };
        }
        return next;
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "ai") {
          next[next.length - 1] = {
            ...last,
            content: `// error: ${err?.message ?? String(err)}`,
            streaming: false,
          };
        }
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [inputValue, hasKey, disabled, isStreaming, messages, streamChat, chapter]);

  if (!hasKey) {
    return (
      <div
        className="rounded p-4 text-xs"
        style={{
          border: "1px solid var(--border)",
          background: "rgba(3,15,4,0.9)",
          color: "var(--green-dim)",
        }}
      >
        // XRAY-AI offline — set VITE_OPENAI_API_KEY in .env
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-2 text-xs"
        style={{ minHeight: 120 }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`${m.role === "user" ? "text-right" : "text-left"}`}
          >
            {m.role === "user" ? (
              <p style={{ color: "var(--green)" }}>{m.content}</p>
            ) : (
              <p style={{ color: "var(--green-dim)" }}>
                <span className="font-bold" style={{ color: "var(--green)" }}>
                  XRAY-AI{" "}
                </span>
                {m.content}
                {m.streaming && (
                  <span className="cursor-blink inline-block w-2">_</span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="border-t p-2" style={{ borderColor: "var(--border)" }}>
        {disabled ? (
          <p className="text-xs" style={{ color: "#1a3d1e" }}>
            // complete the briefing first
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="ask XRAY-AI..."
              className="flex-1 rounded px-3 py-2 text-xs"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--green)",
              }}
              disabled={isStreaming}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className="rounded px-3 py-2 text-xs font-bold tracking-widest"
              style={{
                border: "1px solid var(--green)",
                background: "transparent",
                color: "var(--green)",
              }}
            >
              [ SEND ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
