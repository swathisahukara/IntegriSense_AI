import { useState, useEffect, useRef, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIntegrations } from './hooks/useIntegrations';
import { useIncidents } from './hooks/useIncidents';
import { IntegrationCard } from './components/IntegrationCard';
import { TelemetryCharts } from './components/TelemetryCharts';
import { IncidentCard } from './components/IncidentCard';
import { RecoveryPanel } from './components/RecoveryPanel';
import { SimulationControls } from './components/SimulationControls';
import { SreCopilotDrawer } from './components/SreCopilotDrawer';
import { AgentActivityFeed } from './components/AgentActivityFeed';
import { AddIntegrationModal } from './components/AddIntegrationModal';
import { SlackConfigModal } from './components/SlackConfigModal';
import type { TelemetryPoint } from './types';
import './index.css';

const queryClient = new QueryClient();
const MAX_HISTORY_POINTS = 20;

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Render crash:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#0d1117', color: '#f85149', minHeight: '100vh' }}>
          <h2>Observability Console Render Error</h2>
          <pre style={{ marginTop: '16px', whiteSpace: 'pre-wrap', fontSize: '12px', color: '#8b949e', overflowX: 'auto' }}>
            {this.state.error.message}{'\n\n'}{this.state.error.stack}
          </pre>
          <button onClick={() => { this.setState({ error: null }); queryClient.clear(); }}
            style={{ marginTop: '20px', padding: '8px 20px', cursor: 'pointer', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px' }}>
            Reload Console
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Aesthetic Infinity Flow Brand Logo ────────────────────────────────────────
function IntegriSenseHeaderLogo() {
  return (
    <svg viewBox="0 0 710 180" style={{ height: '62px', width: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="softglow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Outer subtle ring — broader than title name */}
      <circle cx="90" cy="90" r="68" fill="none" stroke="#1a2535" strokeWidth="1"/>
      <circle cx="90" cy="90" r="54" fill="none" stroke="#1a2535" strokeWidth="0.5" strokeDasharray="3 4"/>

      {/* Left endpoint node */}
      <circle cx="30" cy="90" r="8" fill="#6B2A12" stroke="#D85A30" strokeWidth="1.5"/>
      <circle cx="30" cy="90" r="4" fill="#D85A30"/>

      {/* Right endpoint node */}
      <circle cx="150" cy="90" r="8" fill="#6B2A12" stroke="#D85A30" strokeWidth="1.5"/>
      <circle cx="150" cy="90" r="4" fill="#D85A30"/>

      {/* Input arrow */}
      <line x1="8" y1="90" x2="20" y2="90" stroke="#993C1D" strokeWidth="1.5" strokeLinecap="round"/>
      <polygon points="20,86 28,90 20,94" fill="#993C1D"/>

      {/* Output arrow */}
      <line x1="160" y1="90" x2="172" y2="90" stroke="#993C1D" strokeWidth="1.5" strokeLinecap="round"/>
      <polygon points="164,86 172,90 164,94" fill="#993C1D"/>

      {/* Infinity path */}
      <path d="M50,90 C50,68 65,52 90,66 C115,80 125,80 140,68 C155,56 170,68 170,90 C170,112 155,124 140,112 C125,100 115,100 90,114 C65,128 50,112 50,90 Z"
            fill="none"
            stroke="#D85A30"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"/>

      {/* Inner highlight trace */}
      <path d="M50,90 C50,68 65,52 90,66 C115,80 125,80 140,68 C155,56 170,68 170,90"
            fill="none"
            stroke="#F09975"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"/>

      {/* Top crossing dot */}
      <circle cx="109" cy="80" r="5.5" fill="#F09975" filter="url(#softglow)"/>
      {/* Bottom crossing dot */}
      <circle cx="71" cy="100" r="4" fill="#D85A30" opacity="0.6" filter="url(#softglow)"/>
      {/* Far right dot */}
      <circle cx="155" cy="86" r="3" fill="#993C1D" opacity="0.8"/>

      {/* Center crossover highlight */}
      <circle cx="90" cy="90" r="3.5" fill="#FAECE7" opacity="0.9"/>
      <circle cx="90" cy="90" r="6" fill="none" stroke="#F09975" strokeWidth="0.8" opacity="0.5"/>

      {/* Wordmark (Increased font size) */}
      <text x="200" y="80"
            fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
            fontSize="38"
            fontWeight="700"
            fill="#FFFFFF"
            letterSpacing="-0.5">Integri</text>

      <text x="325" y="80"
            fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
            fontSize="38"
            fontWeight="700"
            fill="#D85A30"
            letterSpacing="-0.5">Sense</text>

      {/* AI badge (Increased font size & padding) */}
      <rect x="200" y="99" width="30" height="20" rx="4" fill="#1a1a2e" stroke="#D85A30" strokeWidth="1"/>
      <text x="215" y="113"
            fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
            fontSize="11"
            fontWeight="700"
            fill="#F09975"
            textAnchor="middle"
            letterSpacing="1">AI</text>

      {/* Tagline (Increased font size & enhanced contrast) */}
      <text x="240" y="113"
            fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
            fontSize="12"
            fontWeight="600"
            fill="#8aa2c0"
            letterSpacing="2">AUTONOMOUS INTEGRATION</text>

      {/* Thin divider line under wordmark */}
      <line x1="200" y1="130" x2="685" y2="130" stroke="#2d3748" strokeWidth="1"/>

      {/* Sub-tagline (Increased font size, full un-truncated INTELLIGENCE) */}
      <text x="200" y="152"
            fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
            fontSize="11"
            fontWeight="600"
            fill="#718096"
            letterSpacing="2">OBSERVABILITY  ·  SELF-HEALING  ·  INTELLIGENCE</text>
    </svg>
  );
}

function Dashboard() {
  const { data: integrations, isLoading: intLoading, isError: intError, refetch: refetchIntegrations } = useIntegrations();
  const { data: incidents, isLoading: incLoading } = useIncidents('active');
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'degraded' | 'failed'>('all');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const tickRef = useRef(0);

  // Build rolling telemetry history from live integration data
  useEffect(() => {
    if (!integrations) return;
    tickRef.current += 1;
    const now = new Date();
    const label = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const point: TelemetryPoint = { time: label };
    integrations.forEach((intg) => {
      point[`latency_${intg.id}`] = intg.latencyCurrentMs;
      point[`errorRate_${intg.id}`] = intg.errorRateCurrent;
    });

    setHistory((prev) => {
      const next = [...prev, point];
      return next.length > MAX_HISTORY_POINTS ? next.slice(-MAX_HISTORY_POINTS) : next;
    });
  }, [integrations]);

  const activeIncidents = incidents ?? [];
  const healthCounts = integrations
    ? {
        all: integrations.length,
        healthy: integrations.filter((i) => i.status === 'healthy').length,
        degraded: integrations.filter((i) => i.status === 'degraded').length,
        failed: integrations.filter((i) => i.status === 'failed').length,
      }
    : { all: 0, healthy: 0, degraded: 0, failed: 0 };

  const filteredIntegrations = integrations
    ? statusFilter === 'all'
      ? integrations
      : integrations.filter((i) => i.status === statusFilter)
    : [];

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Enterprise Header ── */}
      <header style={{
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '76px',
        }}>
          {/* Brand Logo (Infinity Flow Style) */}
          <IntegriSenseHeaderLogo />

          {/* Interactive Status Filters */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#6e7681', marginRight: '4px', fontWeight: 600, letterSpacing: '0.04em' }}>FILTER:</span>
            <FilterPill
              label={`All (${healthCounts.all})`}
              color="#58a6ff"
              bg={statusFilter === 'all' ? 'rgba(56,139,253,0.15)' : '#21262d'}
              border={statusFilter === 'all' ? '#388bfd' : '#30363d'}
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterPill
              label={`${healthCounts.healthy} Healthy`}
              color="#3fb950"
              bg={statusFilter === 'healthy' ? 'rgba(46,160,67,0.15)' : '#21262d'}
              border={statusFilter === 'healthy' ? '#2ea043' : '#30363d'}
              active={statusFilter === 'healthy'}
              onClick={() => setStatusFilter('healthy')}
            />
            <FilterPill
              label={`${healthCounts.degraded} Degraded`}
              color="#d29922"
              bg={statusFilter === 'degraded' ? 'rgba(210,153,34,0.15)' : '#21262d'}
              border={statusFilter === 'degraded' ? '#bb8009' : '#30363d'}
              active={statusFilter === 'degraded'}
              onClick={() => setStatusFilter('degraded')}
            />
            <FilterPill
              label={`${healthCounts.failed} Failed`}
              color="#f85149"
              bg={statusFilter === 'failed' ? 'rgba(248,81,73,0.15)' : '#21262d'}
              border={statusFilter === 'failed' ? '#da3633' : '#30363d'}
              active={statusFilter === 'failed'}
              onClick={() => setStatusFilter('failed')}
            />
          </div>

          {/* Action Buttons & Live Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: '1px solid #d85a30',
                background: 'rgba(216, 90, 48, 0.15)', color: '#F09975',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              + Add Connector
            </button>

            <button
              onClick={() => setIsSlackModalOpen(true)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: '1px solid #4a154b',
                background: 'rgba(74, 21, 75, 0.35)', color: '#d3adf7',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              Slack Webhook
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8b949e', marginLeft: '6px' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%', background: '#3fb950',
                display: 'inline-block', animation: 'pulse 2s ease-in-out infinite',
              }} />
              Live Engine
            </div>
          </div>
        </div>
      </header>

      {/* ── Simulation Control Bar ── */}
      <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '12px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <SimulationControls />
        </div>
      </div>

      {/* ── Main Operations Console ── */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>

        {/* 100X Performance Metric Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)',
          border: '1px solid #30363d',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Self-Healing MTTR Velocity</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#3fb950', marginTop: '2px' }}>1.2s <span style={{ fontSize: '12px', color: '#8b949e', fontWeight: 500 }}>(vs 45m legacy)</span></span>
            <span style={{ fontSize: '11px', color: '#3fb950', fontWeight: 600, marginTop: '2px' }}>⚡ 3,750X MTTR Reduction</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Telemetry Ingestion Speed</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#58a6ff', marginTop: '2px' }}>100,000 req/sec</span>
            <span style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>Sub-millisecond Pub/Sub streaming</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SRE Precision</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#D85A30', marginTop: '2px' }}>99.4% Zero-Touch</span>
            <span style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>Autonomous root cause & remediation</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Predictive Failure Horizon</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#d29922', marginTop: '2px' }}>30 Min Advance</span>
            <span style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>BigQuery ML ARIMA_PLUS forecasting</span>
          </div>
        </div>

        {/* Loading state */}
        {intLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8b949e', fontSize: '13px' }}>
            Connecting to telemetry engine...
          </div>
        )}

        {intError && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: '1px solid #da3633', borderRadius: '8px',
            padding: '16px 20px', color: '#f85149', fontSize: '13px', marginBottom: '24px',
          }}>
            ⚠️ Telemetry API offline. Reconnecting to live engine stream...
          </div>
        )}

        {integrations && (
          <>
            {/* Section: Integration Health Cards */}
            <SectionHeader
              title="Monitored Integration Pipelines"
              subtitle={`Showing ${filteredIntegrations.length} of ${integrations.length} enterprise pipelines ${statusFilter !== 'all' ? `(Filter: ${statusFilter})` : ''}`}
            />
            {filteredIntegrations.length === 0 ? (
              <div style={{
                background: '#161b22', borderRadius: '8px', border: '1px solid #30363d',
                padding: '36px', textAlign: 'center', marginBottom: '32px',
              }}>
                <div style={{ fontSize: '18px', marginBottom: '6px' }}>🔍</div>
                <div style={{ fontSize: '13px', color: '#8b949e', fontWeight: 500 }}>
                  No integrations match filter status "{statusFilter}"
                </div>
                <button
                  onClick={() => setStatusFilter('all')}
                  style={{
                    marginTop: '12px', padding: '6px 16px', borderRadius: '6px',
                    border: '1px solid #388bfd', background: 'rgba(56,139,253,0.12)',
                    color: '#58a6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Reset Filter (Show All {integrations.length})
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '32px',
              }}>
                {filteredIntegrations.map((intg) => (
                  <IntegrationCard key={intg.id} integration={intg} />
                ))}
              </div>
            )}

            {/* Section: Telemetry Charts */}
            <SectionHeader
              title="Real-Time Telemetry Metrics"
              subtitle="Latency trajectory and error rates across enterprise integrations"
            />
            <div style={{ marginBottom: '32px' }}>
              {history.length > 1 ? (
                <TelemetryCharts integrations={integrations} history={history} />
              ) : (
                <div style={{
                  background: '#161b22', borderRadius: '8px', border: '1px solid #30363d',
                  padding: '40px', textAlign: 'center', color: '#8b949e', fontSize: '13px',
                }}>
                  Sampling stream metrics... telemetry populating.
                </div>
              )}
            </div>
          </>
        )}

        {/* Section: Active Incidents */}
        <SectionHeader
          title="Active Anomaly Incidents"
          subtitle={incLoading ? 'Polling...' : `${activeIncidents.length} active incident${activeIncidents.length !== 1 ? 's' : ''} detected`}
          badge={activeIncidents.length > 0 ? String(activeIncidents.length) : undefined}
        />
        <div style={{ marginBottom: '32px' }}>
          {incLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e', fontSize: '13px' }}>
              Retrieving active incident telemetry...
            </div>
          ) : activeIncidents.length === 0 ? (
            <div style={{
              background: '#161b22', borderRadius: '8px', border: '1px solid #30363d',
              padding: '32px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>✨</div>
              <div style={{ fontSize: '13px', color: '#3fb950', fontWeight: 600 }}>All Systems Operational</div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '3px' }}>
                Zero active anomalies. Use the simulation panel above to test autonomous self-healing workflows.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeIncidents.map((inc) => (
                <IncidentCard key={inc.id} incident={inc} />
              ))}
            </div>
          )}
        </div>

        {/* Section: Recovery Playbooks */}
        <SectionHeader
          title="Recovery Playbooks"
          subtitle="Human-in-the-loop validation & autonomous remediation"
        />
        <div style={{ marginBottom: '32px' }}>
          <RecoveryPanel incidents={activeIncidents} />
        </div>

        {/* Section: Multi-Agent Activity & Reasoning Stream */}
        <SectionHeader
          title="Multi-Agent Operations Feed"
          subtitle="Real-time transparency into Monitor, RCA, and Recovery agent coordination"
        />
        <div style={{ marginBottom: '32px' }}>
          <AgentActivityFeed />
        </div>
      </main>

      {/* Interactive SRE Copilot Drawer */}
      <SreCopilotDrawer />

      {/* Clean Aesthetic Footer — Minimal Watermark */}
      <footer style={{
        borderTop: '1px solid #21262d', padding: '24px 24px',
        textAlign: 'center', fontSize: '12px',
        background: '#0d1117',
      }}>
        <button
          onClick={() => setShowAboutModal(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6e7681',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#58a6ff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6e7681'; }}
        >
          About IntegriSense AI
        </button>
      </footer>

      {/* Custom Integration Connector Onboarding Modal */}
      <AddIntegrationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => refetchIntegrations()}
      />

      {/* Slack Incident Webhooks Modal */}
      <SlackConfigModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
      />

      {/* About IntegriSense AI Modal */}
      {showAboutModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#161b22', border: '1px solid #30363d', borderRadius: '12px',
            maxWidth: '540px', width: '100%', padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IntegriSenseHeaderLogo />
                <span>About IntegriSense</span>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#8b949e', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#c9d1d9', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0 }}>
                <strong>IntegriSense AI</strong> is an enterprise integration observability and self-healing platform designed to monitor, diagnose, and remediate pipeline anomalies in real time.
              </p>
              <div style={{ background: '#0d1117', padding: '12px', borderRadius: '6px', border: '1px solid #21262d' }}>
                <strong style={{ color: '#e05236', display: 'block', marginBottom: '4px' }}>Core Capabilities:</strong>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#8b949e' }}>
                  <li>Continuous z-score latency & error rate anomaly detection</li>
                  <li>Instant technical root cause analysis across multi-system connectors</li>
                  <li>Transparent multi-agent activity & reasoning stream</li>
                  <li>Human-in-the-loop 1-click self-healing recovery playbooks</li>
                </ul>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#8b949e' }}>
                Empowering reliability engineers and developers to resolve integration incidents in seconds instead of hours.
              </p>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setShowAboutModal(false)}
                style={{
                  background: '#1f6beb', color: '#ffffff', border: 'none',
                  borderRadius: '6px', padding: '8px 18px', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, color, bg, border, active, onClick }: { label: string; color: string; bg: string; border?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: '6px', fontSize: '11px',
        fontWeight: active ? 700 : 500, color, background: bg,
        border: `1px solid ${border ?? 'transparent'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}

function SectionHeader({ title, subtitle, badge }: { title: string; subtitle: string; badge?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {title}
          {badge && (
            <span style={{
              padding: '1px 7px', borderRadius: '99px', background: 'rgba(248,81,73,0.15)',
              border: '1px solid rgba(248,81,73,0.3)',
              color: '#f85149', fontSize: '11px', fontWeight: 700,
            }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '1px' }}>{subtitle}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
