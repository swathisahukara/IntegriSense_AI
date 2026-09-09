import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Incident } from '../types';

interface RecoveryPanelProps {
  incidents: Incident[];
}

export function RecoveryPanel({ incidents }: RecoveryPanelProps) {
  const actionableIncidents = incidents.filter(
    (i) => i.status === 'active' || i.status === 'open' || i.status === 'under_investigation',
  );

  if (actionableIncidents.length === 0) {
    return (
      <div style={{
        background: '#161b22', borderRadius: '8px',
        border: '1px solid #30363d', padding: '32px',
        textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: '20px', marginBottom: '6px' }}>🛡️</div>
        <div style={{ fontSize: '13px', color: '#3fb950', fontWeight: 600 }}>No Pending Recovery Actions</div>
        <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '3px' }}>All monitored enterprise integration pipelines are operating smoothly</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {actionableIncidents.map((incident) => (
        <RecoveryCard key={incident.id} incident={incident} />
      ))}
    </div>
  );
}

function RecoveryCard({ incident }: { incident: Incident }) {
  const [decided, setDecided] = useState<'approved' | 'rejected' | null>(null);
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => api.approveRecovery(incident.id),
    onSuccess: () => {
      setDecided('approved');
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['incidents'] });
        void queryClient.invalidateQueries({ queryKey: ['integrations'] });
        void queryClient.invalidateQueries({ queryKey: ['agentActivities'] });
      }, 2000);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectRecovery(incident.id),
    onSuccess: () => {
      setDecided('rejected');
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['incidents'] });
        void queryClient.invalidateQueries({ queryKey: ['integrations'] });
        void queryClient.invalidateQueries({ queryKey: ['agentActivities'] });
      }, 2000);
    },
  });

  const isLoading = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div style={{
      background: '#161b22', borderRadius: '8px',
      border: decided === 'approved' ? '1px solid #2ea043'
        : decided === 'rejected' ? '1px solid #da3633'
        : '1px solid #30363d',
      padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#58a6ff', fontWeight: 700, letterSpacing: '0.03em', marginBottom: '2px' }}>
            🛡️ RECOMMENDED RECOVERY PLAYBOOK
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3' }}>
            {incident.integrationName}
          </div>
        </div>
        {decided && (
          <span style={{
            padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
            color: decided === 'approved' ? '#3fb950' : '#f85149',
            background: decided === 'approved' ? 'rgba(46,160,67,0.12)' : 'rgba(248,81,73,0.12)',
            border: `1px solid ${decided === 'approved' ? 'rgba(46,160,67,0.3)' : 'rgba(248,81,73,0.3)'}`,
          }}>
            {decided === 'approved' ? '✓ Approved & Executing' : '✗ Rejected'}
          </span>
        )}
      </div>

      {/* Recommendation body */}
      <div style={{
        background: '#0d1117', borderRadius: '6px', padding: '12px',
        marginBottom: '14px', borderLeft: '3px solid #388bfd', border: '1px solid #21262d', borderLeftWidth: '3px',
      }}>
        <div style={{ fontSize: '10px', color: '#8b949e', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.03em' }}>REMEDIATION STRATEGY</div>
        <div style={{ fontSize: '12px', color: '#c9d1d9', lineHeight: 1.5 }}>
          {incident.rootCause
            ? `Based on anomaly diagnosis, execute automated recovery playbook: Restart ${incident.integrationName} connection pool, flush buffer queue, and resume worker concurrency.`
            : 'Executing deep diagnostic trace... auto-remediation playbook queued.'}
        </div>
      </div>

      {/* Risk badge + action buttons */}
      {!decided && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
            fontWeight: 600, color: '#d29922', background: 'rgba(210,153,34,0.12)', border: '1px solid rgba(210,153,34,0.3)',
          }}>
            Remediation Risk: Low (Non-destructive)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={isLoading}
              style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '12px',
                fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                border: '1px solid #30363d', background: '#21262d', color: '#8b949e',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Reject
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={isLoading}
              style={{
                padding: '6px 18px', borderRadius: '6px', fontSize: '12px',
                fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                border: 'none', background: '#1f6beb', color: '#ffffff',
                boxShadow: '0 1px 3px rgba(31,107,235,0.4)',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {approveMutation.isPending ? 'Executing…' : 'Approve & Remediate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
