import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, RefreshCw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAiChat } from '../hooks/useAiChat';

const SUGGESTIONS = [
  'Am I on track this month?',
  'Where am I overspending?',
  'How can I reach my savings goal faster?',
  'What should I cut to save more?',
];

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, streaming, error, sendMessage, reset } = useAiChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    sendMessage(text);
  }

  function handleSuggestion(text: string) {
    if (streaming) return;
    sendMessage(text);
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 sm:bottom-6 sm:right-6"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
        >
          <Sparkles size={16} />
          Ask AI
        </button>
      )}

      {/* Chat panel — full-screen bottom sheet on mobile, floating panel on sm+ */}
      {open && (
        <div
          className="
            fixed z-50 flex flex-col overflow-hidden shadow-2xl
            bottom-0 left-0 right-0 h-[92dvh] rounded-t-2xl
            sm:bottom-6 sm:right-6 sm:left-auto sm:w-[420px] sm:h-[600px] sm:rounded-2xl
          "
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e1b4b)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                <Bot size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Finance Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  className="rounded-lg p-1.5 transition hover:bg-white/10"
                  title="New conversation"
                  style={{ color: 'rgba(148,163,184,0.7)' }}
                >
                  <RefreshCw size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 transition hover:bg-white/10"
                style={{ color: 'rgba(148,163,184,0.7)' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-center text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                  Ask me anything about your finances
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="rounded-xl px-3 py-2 text-left text-xs transition hover:opacity-80"
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: 'rgba(148,163,184,0.9)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                    <Bot size={11} className="text-white" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-full'}`}
                  style={
                    msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)', border: '1px solid rgba(255,255,255,0.07)' }
                  }
                >
                  {streaming && i === messages.length - 1 && !msg.content ? (
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                    </span>
                  ) : msg.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        h3: ({ children }) => <h3 className="font-semibold text-white mt-2 mb-1">{children}</h3>,
                        h4: ({ children }) => <h4 className="font-semibold text-slate-200 mt-1.5 mb-0.5">{children}</h4>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        table: ({ children }) => (
                          <div className="my-2 overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                            <table className="w-full text-xs border-collapse">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead style={{ background: 'rgba(59,130,246,0.15)' }}>{children}</thead>,
                        th: ({ children }) => (
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-200" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-3 py-1.5 text-slate-300" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {children}
                          </td>
                        ),
                        tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
                        code: ({ children }) => (
                          <code className="rounded px-1 py-0.5 text-xs font-mono text-blue-300" style={{ background: 'rgba(59,130,246,0.15)' }}>
                            {children}
                          </code>
                        ),
                        hr: () => <hr className="my-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-center text-xs" style={{ color: '#f87171' }}>{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your finances…"
              disabled={streaming}
              className="flex-1 rounded-xl px-3 py-2 text-xs outline-none placeholder:opacity-40 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.9)' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
            >
              <Send size={13} className="text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
