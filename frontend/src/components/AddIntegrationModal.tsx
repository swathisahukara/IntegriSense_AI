import { useState } from 'react';
import type { CloudProvider } from '../types';

interface AddIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddIntegrationModal({ isOpen, onClose, onSuccess }: AddIntegrationModalProps) {
  const [name, setName] = useState('');
  const [sourceSystem, setSourceSystem] = useState('');
  const [targetSystem, setTargetSystem] = useState('');
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>('gcp');
  const [protocol, setProtocol] = useState('Pub/Sub Stream');
  const [latencyBaselineMs, setLatencyBaselineMs] = useState(250);
  const [errorRateBaseline, setErrorRateBaseline] = useState(0.01);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEndpoint, setCreatedEndpoint] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sourceSystem || !targetSystem) {
      setError('Integration Name, Source System, and Target System are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sourceSystem,
          targetSystem,
          cloudProvider,
          protocol,
          latencyBaselineMs: Number(latencyBaselineMs),
          errorRateBaseline: Number(errorRateBaseline),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create custom integration connector.');
      }

      const resData = await response.json();
      setCreatedEndpoint(resData.endpointUrl || 'Webhook endpoint ready');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating connector');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSourceSystem('');
    setTargetSystem('');
    setCloudProvider('gcp');
    setProtocol('Pub/Sub Stream');
    setError(null);
    setCreatedEndpoint(null);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: '12px',
        width: '100%', maxWidth: '540px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        color: '#e6edf3', overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #21262d', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', background: '#0d1117',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e6edf3', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Add Custom Integration Connector
            </h3>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
              Connect AWS, Azure, GCP or custom hybrid enterprise pipelines
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'transparent', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          {createdEndpoint && (
            <div style={{ padding: '12px 16px', borderRadius: '6px', background: 'rgba(46,160,67,0.15)', border: '1px solid rgba(46,160,67,0.4)', color: '#3fb950', fontSize: '13px' }}>
              🎉 Connector Registered! Webhook Endpoint:<br />
              <code style={{ fontSize: '11px', background: '#0d1117', padding: '4px 8px', borderRadius: '4px', display: 'block', marginTop: '6px', wordBreak: 'break-all' }}>
                {createdEndpoint}
              </code>
            </div>
          )}

          {/* Integration Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
              Integration Name *
            </label>
            <input
              type="text"
              placeholder="e.g. AWS DynamoDB -> BigQuery Sync"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0d1117',
                border: '1px solid #30363d', color: '#e6edf3', fontSize: '14px', outline: 'none',
              }}
            />
          </div>

          {/* Cloud Provider & Protocol */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
                Cloud Provider
              </label>
              <select
                value={cloudProvider}
                onChange={(e) => setCloudProvider(e.target.value as CloudProvider)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0d1117',
                  border: '1px solid #30363d', color: '#e6edf3', fontSize: '14px', outline: 'none',
                }}
              >
                <option value="gcp">Google Cloud Platform (GCP)</option>
                <option value="aws">Amazon Web Services (AWS)</option>
                <option value="azure">Microsoft Azure</option>
                <option value="custom">Hybrid / Custom Webhook</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
                Ingestion Protocol
              </label>
              <input
                type="text"
                placeholder="e.g. EventBridge / Event Grid"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0d1117',
                  border: '1px solid #30363d', color: '#e6edf3', fontSize: '14px', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Source & Target Systems */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
                Source System *
              </label>
              <input
                type="text"
                placeholder="e.g. AWS Kinesis Stream"
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0d1117',
                  border: '1px solid #30363d', color: '#e6edf3', fontSize: '14px', outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
                Target System *
              </label>
              <input
                type="text"
                placeholder="e.g. Snowflake Data Lake"
                value={targetSystem}
                onChange={(e) => setTargetSystem(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0d1117',
                  border: '1px solid #30363d', color: '#e6edf3', fontSize: '14px', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Baselines */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
                Baseline Latency (ms)
              </label>
              <input
                type="number"
                value={latencyBaselineMs}
                onChange={(e) => setLatencyBaselineMs(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0d1117',
                  border: '1px solid #30363d', color: '#e6edf3', fontSize: '14px', outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '6px' }}>
                Target Max Error Rate (0.01 = 1%)
              </label>
              <input
                type="number"
                step="0.005"
                value={errorRateBaseline}
                onChange={(e) => setErrorRateBaseline(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px', background: '#0d1117',
                  border: '1px solid #30363d', color: '#e6edf3', fontSize: '14px', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid #21262d', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '9px 16px', borderRadius: '6px', border: '1px solid #30363d',
                background: '#21262d', color: '#c9d1d9', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 18px', borderRadius: '6px', border: 'none',
                background: 'linear-gradient(135deg, #d85a30 0%, #b8441c 100%)', color: '#ffffff',
                fontSize: '13px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(216,90,48,0.4)',
              }}
            >
              {isSubmitting ? 'Registering...' : '⚡ Initialize Monitoring Connector'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
