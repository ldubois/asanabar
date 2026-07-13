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

  /** Show the « Warp » button on task cards. */
  warpEnabled: boolean;
  /** Directory the Warp session starts in (~ allowed). */
  warpProjectDir: string;
  /** Command run in the Warp session; {url} is replaced by the task permalink. */
  warpCommand: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  workspaceGid: '',
  workspaceName: '',
  userGid: '',
  userName: '',
  refreshInterval: 120000,
  mentionsDays: 14,
  launchAtStartup: true,
  notifications: {
    enabled: true,
    newMention: true,
  },
  theme: 'system',

  warpEnabled: true,
  warpProjectDir: '~/Dev/grenouille',
  warpCommand: 'claude "/asana-task {url}"',
};
