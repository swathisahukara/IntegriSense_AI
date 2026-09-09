import type { Incident } from '../types';

interface IncidentCardProps {
  incident: Incident;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'CRITICAL', color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  high:     { label: 'HIGH',     color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  medium:   { label: 'MEDIUM',   color: '#d29922', bg: 'rgba(210,153,34,0.12)' },
  low:      { label: 'LOW',      color: '#388bfd', bg: 'rgba(56,139,253,0.12)' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:              { label: 'Active',             color: '#f85149' },
  open:                { label: 'Open',               color: '#f85149' },
  under_investigation: { label: 'Investigating',      color: '#d29922' },
  resolved:            { label: 'Resolved',           color: '#3fb950' },
};

export function IncidentCard({ incident }: IncidentCardProps) {
  const sev = SEVERITY_CONFIG[incident.severity] ?? SEVERITY_CONFIG.medium;
  const sta = STATUS_CONFIG[incident.status] ?? STATUS_CONFIG.active;
  const elapsed = Math.round(
    (Date.now() - new Date(incident.detectedAt).getTime()) / 60000,
  );

  return (
    <div style={{
      background: '#161b22', borderRadius: '8px',
      border: '1px solid #30363d', padding: '18px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
            fontWeight: 700, color: sev.color, background: sev.bg,
            border: `1px solid ${sev.color}40`, letterSpacing: '0.04em',
          }}>
            {sev.label}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>
            {incident.integrationName}
          </span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: sta.color }}>
          ● {sta.label}
        </span>
      </div>

      {/* AI Root cause */}
      {incident.rootCause ? (
        <div style={{
          background: '#0d1117', borderRadius: '6px', padding: '12px',
          marginBottom: '12px', fontSize: '12px', color: '#c9d1d9',
          borderLeft: '3px solid #388bfd', border: '1px solid #21262d', borderLeftWidth: '3px',
        }}>
          <span style={{ fontSize: '10px', color: '#58a6ff', fontWeight: 700, display: 'block', marginBottom: '3px', letterSpacing: '0.03em' }}>
            ✨ ROOT CAUSE DIAGNOSIS
          </span>
          {incident.rootCause}
        </div>
      ) : (
        <div style={{
          background: '#0d1117', borderRadius: '6px', padding: '12px',
          marginBottom: '12px', fontSize: '12px', color: '#8b949e',
          borderLeft: '3px solid #388bfd', border: '1px solid #21262d', borderLeftWidth: '3px',
        }}>
          ✨ Analyzing telemetry streams...
        </div>
      )}

      {/* Metrics snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: 'Latency', value: `${incident.metricsSnapshot?.latencyMs ?? 0}ms` },
          { label: 'Error Rate', value: `${((incident.metricsSnapshot?.errorRate ?? 0) * 100).toFixed(1)}%` },
          { label: 'Z-Score', value: (incident.metricsSnapshot?.zScore ?? 2.5).toFixed(2) },
          { label: 'Risk Score', value: `${((incident.metricsSnapshot?.riskScore ?? 0.6) * 100).toFixed(0)}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: '#0d1117', borderRadius: '6px', padding: '8px 10px', textAlign: 'center', border: '1px solid #21262d',
          }}>
            <div style={{ fontSize: '10px', color: '#8b949e' }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f85149', marginTop: '2px' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ fontSize: '11px', color: '#6e7681', borderTop: '1px solid #21262d', paddingTop: '8px' }}>
        Detected {elapsed < 1 ? 'just now' : `${elapsed}m ago`}
        {' · '}Incident ID: <code>{incident.id.slice(0, 12)}…</code>
      </div>
    </div>
  );
}
