import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';

interface Message {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  '🔍 Why is the SAP pipeline latency elevated?',
  '💥 What is the blast radius of active incidents?',
  '🛡️ Explain the recommended recovery steps',
  '📊 Summarize health of all integrations',
];

export function SreCopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'gemini',
      text: '👋 Hello! I am your IntegriSense SRE Copilot. I monitor real-time telemetry, analyze anomaly root causes, and validate recovery playbooks. How can I assist you with your pipelines today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText ?? input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      const localTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const res = await api.chatWithCopilot(textToSend, localTimeStr);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'gemini',
        text: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'gemini',
        text: '⚠️ Unable to connect to telemetry models. Operating in local diagnostic mode.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Copilot Launcher Button — Calm Neutral Antigravity Aesthetic */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 90,
          background: '#161b22',
          color: '#f0f6fc',
          border: '1px solid #30363d',
          borderRadius: '30px',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#58a6ff';
          e.currentTarget.style.background = '#21262d';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#30363d';
          e.currentTarget.style.background = '#161b22';
        }}
      >
        <span style={{ color: '#58a6ff', fontSize: '15px' }}>✨</span>
        <span>{isOpen ? 'Close SRE Copilot' : 'Ask Gemini SRE'}</span>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '420px',
            maxWidth: '90vw',
            height: '100vh',
            background: '#161b22',
            borderLeft: '1px solid #30363d',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #30363d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0d1117',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(56, 139, 253, 0.15)',
                  border: '1px solid rgba(56, 139, 253, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: '#58a6ff',
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6fc' }}>
                  Gemini SRE Copilot
                </div>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>
                  Real-time Integration & Anomaly Intelligence
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8b949e',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div
            style={{
              padding: '10px 16px',
              background: '#161b22',
              borderBottom: '1px solid #21262d',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                style={{
                  padding: '5px 11px',
                  borderRadius: '16px',
                  border: '1px solid #30363d',
                  background: '#0d1117',
                  color: '#c9d1d9',
                  fontSize: '11px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                  }}
                >
                  <div
                    style={{
                      background: isUser ? '#1f6beb' : '#0d1117',
                      color: isUser ? '#ffffff' : '#e6edf3',
                      border: isUser ? 'none' : '1px solid #30363d',
                      borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  >
                    {!isUser && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#58a6ff',
                          fontWeight: 700,
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>✨ SRE ADVISOR</span>
                      </div>
                    )}
                    {m.text}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#6e7681',
                      marginTop: '3px',
                      textAlign: isUser ? 'right' : 'left',
                    }}
                  >
                    {m.timestamp}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#8b949e',
                }}
              >
                ✨ SRE Copilot analyzing telemetry context...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div
            style={{
              padding: '14px 16px',
              borderTop: '1px solid #30363d',
              background: '#0d1117',
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                type="text"
                placeholder="Ask about pipeline degradation, root causes, or recovery..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                style={{
                  flex: 1,
                  background: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#e6edf3',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  background: '#1f6beb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !input.trim() ? 0.6 : 1,
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default SreCopilotDrawer;
