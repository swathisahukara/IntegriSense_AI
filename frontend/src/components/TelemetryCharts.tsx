import type { ReactNode } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { Integration, TelemetryPoint } from '../types';

interface TelemetryChartsProps {
  integrations: Integration[];
  history: TelemetryPoint[];
}

const LINE_COLORS = ['#58a6ff', '#38d9a9', '#d29922', '#a371f7'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0d1117', border: '1px solid #30363d',
        borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#e6edf3',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}>
        <div style={{ marginBottom: '4px', color: '#8b949e', fontWeight: 600 }}>{label}</div>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} style={{ color: entry.color, marginBottom: '2px', fontSize: '11px' }}>
            {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function TelemetryCharts({ integrations, history }: TelemetryChartsProps) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
    }}>
      {/* Latency Chart */}
      <ChartCard title="Latency Trajectory (ms)" subtitle="Real-time performance monitoring across pipelines">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6e7681' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6e7681' }} width={45} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
              formatter={(value) => <span style={{ color: '#8b949e' }}>{value}</span>}
            />
            {integrations.map((intg, idx) => (
              <Line
                key={intg.id}
                type="monotone"
                dataKey={`latency_${intg.id}`}
                name={intg.name.split(' ')[0]}
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
            {integrations[0] && (
              <ReferenceLine
                y={integrations[0].latencyBaselineMs}
                stroke="#30363d"
                strokeDasharray="4 4"
                label={{ value: 'Baseline', position: 'right', fontSize: 10, fill: '#6e7681' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Error Rate Chart */}
      <ChartCard title="Error Rate Trajectory (%)" subtitle="Real-time failure probability monitoring across pipelines">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6e7681' }} />
            <YAxis
              tick={{ fontSize: 10, fill: '#6e7681' }}
              width={45}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
              formatter={(value) => <span style={{ color: '#8b949e' }}>{value}</span>}
            />
            {integrations.map((intg, idx) => (
              <Line
                key={intg.id}
                type="monotone"
                dataKey={`errorRate_${intg.id}`}
                name={intg.name.split(' ')[0]}
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div style={{
      background: '#161b22', borderRadius: '8px',
      border: '1px solid #30363d', padding: '16px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    }}>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '1px' }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}
