export interface NotificationConfig {
  enabled: boolean;
  newMention: boolean;
}

export interface AppConfig {
  /** Asana workspace gid the app polls (mentions + my tasks). */
  workspaceGid: string;
  /** Cached human-readable workspace name (display only). */
  workspaceName: string;
  /** Cached gid of the authenticated user (detected on token validation). */
  userGid: string;
  /** Cached name of the authenticated user (display only). */
  userName: string;

  refreshInterval: number;
  /** How many days back to look for mentions. */
  mentionsDays: number;
  launchAtStartup: boolean;
  notifications: NotificationConfig;
  theme: 'system' | 'light' | 'dark';
  /** Story gids archived locally (hidden from the popover). */
  archivedStories: string[];
}

export const DEFAULT_CONFIG: AppConfig = {
  workspaceGid: '',
  workspaceName: '',
  userGid: '',
  userName: '',
  refreshInterval: 120000,
  mentionsDays: 14,
  launchAtStartup: false,
  notifications: {
    enabled: true,
    newMention: true,
  },
  theme: 'system',
  archivedStories: [],
};
