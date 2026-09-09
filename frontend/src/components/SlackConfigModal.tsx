import { useState } from 'react';

interface SlackConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SlackConfigModal({ isOpen, onClose }: SlackConfigModalProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAlert = async () => {
    if (!webhookUrl) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Slack Incoming Webhook URL.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Slack alert delivery failed.');
      }

      setStatusMessage({ type: 'success', text: '🎉 Test incident diagnostic card sent to your Slack channel!' });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error delivering Slack alert.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: '12px',
        width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        color: '#e6edf3', overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #21262d', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', background: '#0d1117',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e6edf3', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Slack Incident Webhooks
            </h3>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
              Receive real-time Gemini SRE diagnostic cards & recovery buttons
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {statusMessage && (
            <div style={{
              padding: '10px 14px', borderRadius: '6px', fontSize: '13px',
              background: statusMessage.type === 'success' ? 'rgba(46,160,67,0.15)' : 'rgba(248,81,73,0.15)',
              border: `1px solid ${statusMessage.type === 'success' ? 'rgba(46,160,67,0.4)' : 'rgba(248,81,73,0.4)'}`,
              color: statusMessage.type === 'success' ? '#3fb950' : '#f85149',
            }}>
              {statusMessage.text}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
              Slack Incoming Webhook URL
            </label>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/YOUR_WORKSPACE_ID/YOUR_CHANNEL_ID/YOUR_TOKEN"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0d1117',
                border: '1px solid #30363d', color: '#e6edf3', fontSize: '13px', outline: 'none',
              }}
            />
          </div>

          <div style={{ background: '#0d1117', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d', fontSize: '12px', color: '#8b949e', lineHeight: 1.5 }}>
            <strong style={{ color: '#e6edf3' }}>Features included in Slack alerts:</strong>
            <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
              <li>Real-time root cause analysis by Gemini 2.5 Copilot</li>
              <li>Predictive failure probability & impact metrics</li>
              <li>Instant 1-click self-healing execution action buttons</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid #21262d', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px', borderRadius: '6px', border: '1px solid #30363d',
                background: '#21262d', color: '#c9d1d9', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={isSending}
              style={{
                padding: '9px 18px', borderRadius: '6px', border: 'none',
                background: 'linear-gradient(135deg, #4a154b 0%, #611f69 100%)', color: '#ffffff',
                fontSize: '13px', fontWeight: 700, cursor: isSending ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(74,21,75,0.4)', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span>🚀</span> {isSending ? 'Sending Alert...' : 'Send Test Slack Diagnostic'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
