import { BrowserWindow } from 'electron';
import { Mention, TodayTask, TrayStatus } from '../../shared/types';
import { config } from '../store/config';
import { keychain } from '../store/keychain';
import { AsanaClient } from '../api/asana';
import { checkNewMentions, cleanNotificationCache } from './notifications';

export type { TrayStatus };

export interface PollingData {
  mentions: Mention[];
  todayTasks: TodayTask[];
  lastUpdated: Date;
  status: TrayStatus;
  error?: string;
}

const IPC_CHANNELS = {
  DATA_UPDATED: 'data:updated',
};

/** Build an Asana client from the keychain token, or null when unconfigured. */
export function buildAsanaClient(): AsanaClient | null {
  const token = keychain.getToken('asana');
  return token ? new AsanaClient(token) : null;
}

class PollingService {
  private intervalId: NodeJS.Timeout | null = null;
  private client: AsanaClient | null = null;
  private lastData: PollingData = {
    mentions: [],
    todayTasks: [],
    lastUpdated: new Date(),
    status: 'gray',
  };
  private onDataUpdate: ((data: PollingData) => void) | null = null;
  private isRefreshing = false;

  start(callback?: (data: PollingData) => void): void {
    if (callback) this.onDataUpdate = callback;
    this.stop();
    // New token may have been saved: rebuild the client on (re)start.
    this.client = buildAsanaClient();
    this.refresh();
    this.intervalId = setInterval(() => this.refresh(), config.getRefreshInterval());
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  restart(): void {
    this.start(this.onDataUpdate || undefined);
  }

  async refresh(): Promise<PollingData> {
    if (this.isRefreshing) return this.lastData;
    this.isRefreshing = true;

    try {
      if (!this.client) this.client = buildAsanaClient();
      const workspaceGid = config.get('workspaceGid');
      const userGid = config.get('userGid');

      if (!this.client || !workspaceGid || !userGid) {
        this.lastData = {
          mentions: [],
          todayTasks: [],
          lastUpdated: new Date(),
          status: 'gray',
        };
        this.emitUpdate();
        return this.lastData;
      }

      const [mentions, todayTasks] = await Promise.all([
        this.client.getMentions(workspaceGid, userGid, config.get('mentionsDays') || 14),
        this.client.getTodayTasks(workspaceGid),
      ]);

      checkNewMentions(this.lastData.mentions, mentions);

      this.lastData = {
        mentions,
        todayTasks,
        lastUpdated: new Date(),
        status: 'green',
      };

      cleanNotificationCache();
      this.recalculateStatus();
      return this.lastData;
    } catch (error) {
      this.lastData = {
        ...this.lastData,
        lastUpdated: new Date(),
        status: 'gray',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.emitUpdate();
      return this.lastData;
    } finally {
      this.isRefreshing = false;
    }
  }

  private calculateStatus(): TrayStatus {
    if (!config.get('workspaceGid') || !keychain.hasToken('asana')) return 'gray';
    if (this.lastData.mentions.length > 0) return 'red';
    if (this.lastData.todayTasks.length > 0) return 'orange';
    return 'green';
  }

  private emitUpdate(): void {
    if (this.onDataUpdate) this.onDataUpdate(this.lastData);

    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.DATA_UPDATED, this.lastData);
      }
    });
  }

  getData(): PollingData {
    return this.lastData;
  }

  recalculateStatus(): void {
    this.lastData = { ...this.lastData, status: this.calculateStatus() };
    this.emitUpdate();
  }
}

export const pollingService = new PollingService();
