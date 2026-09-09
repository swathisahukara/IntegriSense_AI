import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { AgentActivity } from '../types';

const AGENT_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  MonitorAgent:    { label: 'MonitorAgent',    color: '#388bfd', bg: 'rgba(56,139,253,0.12)' },
  RCAAgent:        { label: 'RCAAgent (Gemini)', color: '#a371f7', bg: 'rgba(163,113,247,0.12)' },
  PredictionAgent: { label: 'PredictionAgent', color: '#d29922', bg: 'rgba(210,153,34,0.12)' },
  RecoveryAgent:   { label: 'RecoveryAgent',   color: '#3fb950', bg: 'rgba(46,160,67,0.12)' },
  Orchestrator:    { label: 'Orchestrator',    color: '#58a6ff', bg: 'rgba(88,166,255,0.12)' },
};

function formatAgentTimestamp(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  const now = new Date();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const isToday = d.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `Today, ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  } else {
    const month = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${month}, ${timeStr}`;
  }
}

export function AgentActivityFeed() {
  const [showExplanation, setShowExplanation] = useState(false);

  const { data: activities, isLoading } = useQuery<AgentActivity[]>({
    queryKey: ['agentActivities'],
    queryFn: () => api.getAgentActivities(),
    refetchInterval: 10000,
  });

  const recent = activities ?? [];

  return (
    <div
      style={{
        background: '#161b22',
        borderRadius: '8px',
        border: '1px solid #30363d',
        padding: '18px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          borderBottom: '1px solid #21262d',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#388bfd',
              boxShadow: '0 0 8px #388bfd',
            }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6fc' }}>
              Autonomous Multi-Agent Activity & Reasoning Stream
            </div>
            <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '1px' }}>
              Real-time transparent collaboration across Monitor, RCA, Prediction, and Recovery agents
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            style={{
              background: 'rgba(56,139,253,0.1)',
              border: '1px solid rgba(56,139,253,0.3)',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#58a6ff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>💡</span>
            <span>{showExplanation ? 'Hide SRE Impact Guide' : 'How this speeds resolution'}</span>
          </button>
          <div style={{ fontSize: '11px', color: '#3fb950', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3fb950' }} />
            Active Mesh
          </div>
        </div>
      </div>

      {/* Interactive SRE Value Explanation Banner */}
      {showExplanation && (
        <div
          style={{
            background: '#0d1117',
            border: '1px solid #30363d',
            borderLeft: '3px solid #388bfd',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '14px',
            fontSize: '12px',
            color: '#c9d1d9',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: '#f0f6fc', marginBottom: '6px', fontSize: '13px' }}>
            🚀 How Multi-Agent Observability Transforms Developer Experience & Speeds Incident Resolution:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '8px' }}>
            <div>
              <span style={{ color: '#58a6ff', fontWeight: 600 }}>1. Reduces MTTR from Hours to Seconds:</span>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#8b949e' }}>
                Instead of developers manually querying raw logs and metrics during an outage, specialized agents correlate telemetry instantly.
              </p>
            </div>
            <div>
              <span style={{ color: '#a371f7', fontWeight: 600 }}>2. Full Autonomous Transparency:</span>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#8b949e' }}>
                Eliminates "black-box AI" distrust by displaying step-by-step agent decisions and evidence before action is taken.
              </p>
            </div>
            <div>
              <span style={{ color: '#3fb950', fontWeight: 600 }}>3. Proactive Cascade Mitigation:</span>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#8b949e' }}>
                PredictionAgent flags potential downstream bottlenecks (e.g. NetSuite ERP webhooks) before failures affect business operations.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#8b949e', fontSize: '12px' }}>
          Streaming agent reasoning traces...
        </div>
      ) : recent.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#8b949e', fontSize: '12px' }}>
          Agents in standby state. Injecting scenarios above will trigger real-time agent reasoning.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {recent.map((act) => {
            const badge = AGENT_BADGES[act.agentName] ?? AGENT_BADGES['Orchestrator'];
            return (
              <div
                key={act.id}
                style={{
                  background: '#0d1117',
                  border: '1px solid #21262d',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: badge.color,
                    background: badge.bg,
                    border: `1px solid ${badge.color}40`,
                    whiteSpace: 'nowrap',
                    marginTop: '1px',
                  }}
                >
                  {badge.label}
                </span>
                <div style={{ flex: 1, fontSize: '12px', color: '#c9d1d9', lineHeight: 1.4 }}>
                  {act.message}
                </div>
                <div style={{ fontSize: '10px', color: '#6e7681', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatAgentTimestamp(act.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AgentActivityFeed;
