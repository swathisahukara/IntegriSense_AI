import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const SCENARIOS = [
  { id: 'normal',      label: 'Normal',    emoji: '✅', color: '#3fb950', bg: 'rgba(46,160,67,0.12)', border: 'rgba(46,160,67,0.3)' },
  { id: 'degradation', label: 'Degrade',   emoji: '⚠️', color: '#d29922', bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.3)' },
  { id: 'incident',    label: 'Incident',  emoji: '🔴', color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.3)' },
  { id: 'cascading',   label: 'Cascading', emoji: '💥', color: '#a371f7', bg: 'rgba(163,113,247,0.12)', border: 'rgba(163,113,247,0.3)' },
];

export function SimulationControls() {
  const [activeScenario, setActiveScenario] = useState<string>('normal');
  const [pendingScenario, setPendingScenario] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const simulateMutation = useMutation({
    mutationFn: (scenario: string) => {
      setPendingScenario(scenario);
      return api.simulate(scenario);
    },
    onSuccess: (_, scenario) => {
      setActiveScenario(scenario);
      setPendingScenario(null);
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      void queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: () => {
      setPendingScenario(null);
    },
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          INJECT SIMULATION:
        </span>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {SCENARIOS.map((s) => {
          const isActive = activeScenario === s.id;
          const isPendingThis = pendingScenario === s.id;

          return (
            <button
              key={s.id}
              onClick={() => simulateMutation.mutate(s.id)}
              style={{
                padding: '5px 14px', borderRadius: '6px', fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                border: `1px solid ${isActive ? s.border : '#30363d'}`,
                background: isActive ? s.bg : '#21262d',
                color: isActive ? s.color : '#c9d1d9',
                transition: 'all 0.15s ease',
              }}
            >
              {isPendingThis ? 'Applying...' : `${s.emoji} ${s.label}`}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: '11px', color: '#8b949e', marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeScenario === 'normal' ? '#3fb950' : '#d29922' }} />
        Active Scenario: <strong style={{ color: '#e6edf3', textTransform: 'capitalize' }}>{activeScenario}</strong>
      </div>
    </div>
  );
}
