import type { Integration } from '../types';

interface IntegrationCardProps {
  integration: Integration;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  healthy: {
    label: 'Healthy',
    color: '#3fb950',
    bg: 'rgba(46, 160, 67, 0.12)',
    border: 'rgba(46, 160, 67, 0.3)',
    dot: '#3fb950',
  },
  degraded: {
    label: 'Degraded',
    color: '#d29922',
    bg: 'rgba(210, 153, 34, 0.12)',
    border: 'rgba(210, 153, 34, 0.3)',
    dot: '#d29922',
  },
  failed: {
    label: 'Failed',
    color: '#f85149',
    bg: 'rgba(248, 81, 73, 0.12)',
    border: 'rgba(248, 81, 73, 0.3)',
    dot: '#f85149',
  },
};

function formatLatencyDelta(current: number, baseline: number): string {
  if (!baseline || baseline === 0) return '';
  const diff = current - baseline;
  const pct = Math.round((diff / baseline) * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

function formatErrorRate(rate: number): string {
  if (rate === undefined || rate === null || Number.isNaN(rate)) return '0.00%';
  return `${(rate * 100).toFixed(2)}%`;
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const cfg = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG.healthy;
  const latencyDelta = formatLatencyDelta(integration.latencyCurrentMs, integration.latencyBaselineMs);
  const latencyUp = (integration.latencyCurrentMs ?? 0) > (integration.latencyBaselineMs ?? 1) * 1.2;

  const providerLabel = integration.cloudProvider ? integration.cloudProvider.toUpperCase() : 'GCP';
  const providerBg = integration.cloudProvider === 'aws' ? 'rgba(255, 153, 0, 0.15)' : integration.cloudProvider === 'azure' ? 'rgba(0, 120, 212, 0.15)' : 'rgba(66, 133, 244, 0.15)';
  const providerColor = integration.cloudProvider === 'aws' ? '#ff9900' : integration.cloudProvider === 'azure' ? '#0078d4' : '#4285f4';

  const risk = integration.predictiveRisk;
  const isHighRisk = risk && risk.failureProbability >= 0.5;

  return (
    <div style={{
      background: '#161b22',
      borderRadius: '8px',
      border: `1px solid ${cfg.border}`,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      transition: 'border-color 0.2s',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '9px', fontWeight: 800, color: providerColor, background: providerBg,
              padding: '1px 6px', borderRadius: '4px', border: `1px solid ${providerColor}40`,
            }}>
              {providerLabel}
            </span>
            <span style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {integration.sourceSystem}
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>
            {integration.name}
          </div>
          <div style={{ fontSize: '12px', color: '#6e7681', marginTop: '1px' }}>
            → {integration.targetSystem}
          </div>
        </div>
        {/* Status badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 9px', borderRadius: '99px', fontSize: '11px',
          fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: cfg.dot, display: 'inline-block',
            ...(integration.status !== 'healthy' ? {
              animation: 'pulse 1.5s ease-in-out infinite',
            } : {}),
          }} />
          {cfg.label}
        </span>
      </div>

      {/* Predictive Failure Risk Badge */}
      {risk && (
        <div style={{
          background: isHighRisk ? 'rgba(216, 90, 48, 0.12)' : 'rgba(46, 160, 67, 0.08)',
          border: `1px solid ${isHighRisk ? 'rgba(216, 90, 48, 0.35)' : 'rgba(46, 160, 67, 0.25)'}`,
          borderRadius: '6px',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: isHighRisk ? '#f85149' : '#3fb950' }}>
            <span style={{ fontSize: '12px' }}>{isHighRisk ? '⚠️' : '🔮'}</span>
            <span>{risk.riskBadge}</span>
          </div>
          <span style={{ fontSize: '10px', color: '#8b949e' }}>
            Risk Model {Math.round(risk.modelConfidence * 100)}% conf
          </span>
        </div>
      )}

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <MetricBox
          label="Latency"
          value={`${integration.latencyCurrentMs}ms`}
          sub={`Base ${integration.latencyBaselineMs}ms`}
          delta={latencyDelta}
          bad={latencyUp}
        />
        <MetricBox
          label="Error Rate"
          value={formatErrorRate(integration.errorRateCurrent)}
          sub={`Base ${formatErrorRate(integration.errorRateBaseline)}`}
          delta={integration.errorRateCurrent > integration.errorRateBaseline ? '▲' : '▼'}
          bad={integration.errorRateCurrent > integration.errorRateBaseline * 1.5}
        />
        <MetricBox
          label="Queue Depth"
          value={String(integration.queueDepthCurrent)}
          sub="messages"
          bad={integration.queueDepthCurrent > 50}
        />
        <MetricBox
          label="DLQ Backlog"
          value={String(integration.dlqCountCurrent)}
          sub="dead letters"
          bad={integration.dlqCountCurrent > 0}
        />
      </div>

      {/* Footer */}
      <div style={{ fontSize: '11px', color: '#6e7681', borderTop: '1px solid #21262d', paddingTop: '8px' }}>
        Last tick {new Date(integration.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
}

interface MetricBoxProps {
  label: string;
  value: string;
  sub: string;
  delta?: string;
  bad?: boolean;
}

function MetricBox({ label, value, sub, delta, bad }: MetricBoxProps) {
  return (
    <div style={{
      background: '#0d1117', borderRadius: '6px', padding: '8px 10px', border: '1px solid #21262d',
    }}>
      <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '2px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: bad ? '#f85149' : '#e6edf3' }}>
          {value}
        </span>
        {delta && (
          <span style={{ fontSize: '10px', fontWeight: 600, color: bad ? '#f85149' : '#3fb950' }}>
            {delta}
          </span>
        )}
      </div>
      <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '1px' }}>{sub}</div>
    </div>
  );
}
