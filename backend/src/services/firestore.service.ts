/**
 * IntegriSense AI — Firestore Service
 *
 * Manages transactional operational states: Incidents, Recovery Actions (Approvals),
 * and Agent Activity Logs.
 *
 * Supports a local in-memory fallback when Firestore is disabled in configuration
 * (ENABLE_FIRESTORE=false) to allow offline local development and isolated unit testing.
 *
 * Azure equivalent:
 *   Cosmos DB data access layer service.
 */

import { Firestore } from '@google-cloud/firestore';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';
import type { Incident, RecoveryAction, AgentActivity } from '../models/incident.model.js';
import { AppError, NotFoundError } from '../utils/errors.js';

const log = createLogger('firestore-service');

class FirestoreService {
  private db: Firestore | null = null;

  // In-memory fallbacks for offline development/testing
  private mockIncidents: Map<string, Incident> = new Map();
  private mockApprovals: Map<string, RecoveryAction> = new Map();
  private mockActivities: AgentActivity[] = [];

  constructor() {
    if (env.ENABLE_FIRESTORE) {
      log.info(
        { project: env.GCP_PROJECT_ID, database: env.FIRESTORE_DATABASE },
        'Initializing Google Cloud Firestore client...',
      );
      try {
        this.db = new Firestore({
          projectId: env.GCP_PROJECT_ID,
          databaseId: env.FIRESTORE_DATABASE,
          fallback: process.env['NODE_TLS_REJECT_UNAUTHORIZED'] === '0', // Use REST fallback locally if behind SSL-decrypting proxy
        });
      } catch (err: unknown) {
        log.error({ err }, 'Failed to initialize Firestore client. Falling back to mock store.');
        this.db = null;
      }
    } else {
      log.warn('Firestore is disabled in configuration. Running in-memory database stub.');
    }
  }

  // ── Incidents Operations ───────────────────────────────────────────────────

  /**
   * Records a new incident document.
   */
  public async createIncident(incident: Incident): Promise<void> {
    log.info({ incidentId: incident.id, integrationId: incident.integrationId }, 'Creating incident');

    if (this.db) {
      try {
        await this.db.collection('incidents').doc(incident.id).set(incident);
      } catch (err: unknown) {
        log.error({ err, incidentId: incident.id }, 'Firestore error during createIncident');
        throw new AppError('Failed to write incident to database', 500);
      }
    } else {
      this.mockIncidents.set(incident.id, { ...incident });
    }
  }

  /**
   * Retrieves an incident document by ID.
   */
  public async getIncident(id: string): Promise<Incident> {
    log.debug({ incidentId: id }, 'Fetching incident');

    if (this.db) {
      try {
        const doc = await this.db.collection('incidents').doc(id).get();
        if (!doc.exists) {
          throw new NotFoundError(`Incident ${id}`);
        }
        return doc.data() as Incident;
      } catch (err: unknown) {
        if (err instanceof NotFoundError) throw err;
        log.error({ err, incidentId: id }, 'Firestore error during getIncident');
        throw new AppError('Failed to read incident from database', 500);
      }
    } else {
      const incident = this.mockIncidents.get(id);
      if (!incident) {
        throw new NotFoundError(`Incident ${id}`);
      }
      return { ...incident };
    }
  }

  /**
   * Updates an existing incident document.
   */
  public async updateIncident(id: string, updates: Partial<Incident>): Promise<void> {
    log.info({ incidentId: id, updates }, 'Updating incident');

    if (this.db) {
      try {
        await this.db.collection('incidents').doc(id).update(updates);
      } catch (err: unknown) {
        log.error({ err, incidentId: id }, 'Firestore error during updateIncident');
        throw new AppError('Failed to update incident in database', 500);
      }
    } else {
      const existing = this.mockIncidents.get(id);
      if (!existing) {
        throw new NotFoundError(`Incident ${id}`);
      }
      this.mockIncidents.set(id, { ...existing, ...updates } as Incident);
    }
  }

  /**
   * Retrieves active incidents, ordered by detection time descending.
   */
  public async listActiveIncidents(): Promise<Incident[]> {
    log.debug('Listing active incidents');

    if (this.db) {
      try {
        const snapshot = await this.db
          .collection('incidents')
          .where('status', '!=', 'resolved')
          .get();

        return snapshot.docs.map((doc) => doc.data() as Incident);
      } catch (err: unknown) {
        log.error({ err }, 'Firestore error during listActiveIncidents');
        throw new AppError('Failed to list incidents from database', 500);
      }
    } else {
      return Array.from(this.mockIncidents.values())
        .filter((inc) => inc.status !== 'resolved')
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
    }
  }

  /**
   * Retrieves all incidents, ordered by detection time descending.
   */
  public async listIncidents(): Promise<Incident[]> {
    log.debug('Listing all incidents');

    if (this.db) {
      try {
        const snapshot = await this.db
          .collection('incidents')
          .get();

        return snapshot.docs
          .map((doc) => doc.data() as Incident)
          .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
      } catch (err: unknown) {
        log.error({ err }, 'Firestore error during listIncidents');
        throw new AppError('Failed to list incidents from database', 500);
      }
    } else {
      return Array.from(this.mockIncidents.values())
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
    }
  }

  // ── Approvals / Recovery Action Operations ──────────────────────────────────

  /**
   * Records a new recovery action recommendation (waiting for approval).
   */
  public async createRecoveryAction(action: RecoveryAction): Promise<void> {
    log.info({ actionId: action.id, incidentId: action.incidentId }, 'Creating recovery action approval entry');

    if (this.db) {
      try {
        await this.db.collection('approvals').doc(action.id).set(action);
      } catch (err: unknown) {
        log.error({ err, actionId: action.id }, 'Firestore error during createRecoveryAction');
        throw new AppError('Failed to write recovery action to database', 500);
      }
    } else {
      this.mockApprovals.set(action.id, { ...action });
    }
  }

  /**
   * Retrieves a recovery action recommendation.
   */
  public async getRecoveryAction(id: string): Promise<RecoveryAction> {
    log.debug({ actionId: id }, 'Fetching recovery action');

    if (this.db) {
      try {
        const doc = await this.db.collection('approvals').doc(id).get();
        if (!doc.exists) {
          throw new NotFoundError(`RecoveryAction ${id}`);
        }
        return doc.data() as RecoveryAction;
      } catch (err: unknown) {
        if (err instanceof NotFoundError) throw err;
        log.error({ err, actionId: id }, 'Firestore error during getRecoveryAction');
        throw new AppError('Failed to read recovery action from database', 500);
      }
    } else {
      const action = this.mockApprovals.get(id);
      if (!action) {
        throw new NotFoundError(`RecoveryAction ${id}`);
      }
      return { ...action };
    }
  }

  /**
   * Approves or rejects a recovery recommendation (Human-in-the-Loop decision).
   */
  public async updateRecoveryDecision(
    id: string,
    status: 'approved' | 'rejected',
    operatorId: string,
  ): Promise<void> {
    log.info({ actionId: id, status, operatorId }, 'Recording operator recovery decision');

    const updates = {
      status,
      decidedBy: operatorId,
      decidedAt: new Date().toISOString(),
    };

    if (this.db) {
      try {
        await this.db.collection('approvals').doc(id).update(updates);
      } catch (err: unknown) {
        log.error({ err, actionId: id }, 'Firestore error during updateRecoveryDecision');
        throw new AppError('Failed to record recovery decision in database', 500);
      }
    } else {
      const existing = this.mockApprovals.get(id);
      if (!existing) {
        throw new NotFoundError(`RecoveryAction ${id}`);
      }
      this.mockApprovals.set(id, { ...existing, ...updates });
    }
  }

  // ── Agent Activity Operations ───────────────────────────────────────────────

  /**
   * Appends an agent reasoning trace log.
   */
  public async logAgentActivity(activity: AgentActivity): Promise<void> {
    log.debug(
      { agent: activity.agentName, incidentId: activity.incidentId, type: activity.activityType },
      'Logging agent activity',
    );

    if (this.db) {
      try {
        await this.db.collection('agent_activity').doc(activity.id).set(activity);
      } catch (err: unknown) {
        // Log error but do not crash the application for telemetry logging failures
        log.error({ err, activityId: activity.id }, 'Firestore error during logAgentActivity');
      }
    } else {
      this.mockActivities.push({ ...activity });
    }
  }

  /**
   * Lists all activities related to an incident, sorted by timestamp ascending.
   */
  public async listAgentActivities(incidentId: string): Promise<AgentActivity[]> {
    log.debug({ incidentId }, 'Listing agent activities');

    if (this.db) {
      try {
        const snapshot = await this.db
          .collection('agent_activity')
          .where('incidentId', '==', incidentId)
          .get();

        return snapshot.docs
          .map((doc) => doc.data() as AgentActivity)
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      } catch (err: unknown) {
        log.error({ err, incidentId }, 'Firestore error during listAgentActivities');
        throw new AppError('Failed to retrieve agent activities', 500);
      }
    } else {
      return this.mockActivities
        .filter((act) => act.incidentId === incidentId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
  }

  // ── Scenarios Operations ────────────────────────────────────────────────────

  /**
   * Saves active scenarios map to Firestore.
   */
  public async saveActiveScenarios(scenarios: Record<string, string>): Promise<void> {
    log.info({ scenarios }, 'Saving active simulation scenarios map to Firestore');

    if (this.db) {
      try {
        await this.db.collection('settings').doc('simulation').set({ scenarios });
      } catch (err: unknown) {
        log.error({ err }, 'Firestore error during saveActiveScenarios');
      }
    } else {
      // Offline fallback
      this.mockApprovals.set('scenarios', scenarios as any);
    }
  }

  /**
   * Loads active scenarios map from Firestore.
   */
  public async loadActiveScenarios(): Promise<Record<string, string>> {
    log.debug('Loading active simulation scenarios map from Firestore');

    if (this.db) {
      try {
        const doc = await this.db.collection('settings').doc('simulation').get();
        if (doc.exists) {
          return (doc.data()?.scenarios as Record<string, string>) || {};
        }
      } catch (err: unknown) {
        log.error({ err }, 'Firestore error during loadActiveScenarios');
      }
      return {};
    } else {
      // Offline fallback
      return (this.mockApprovals.get('scenarios') as any) || {};
    }
  }

  /**
   * Helper to clear mocks (only used during unit testing).
   */
  public clearMocks(): void {
    this.mockIncidents.clear();
    this.mockApprovals.clear();
    this.mockActivities = [];
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService;
