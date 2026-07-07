import Store from 'electron-store';
import { AppConfig, DEFAULT_CONFIG } from '../../shared/types/config';

const configStore = new Store<AppConfig>({
  name: 'config',
  defaults: DEFAULT_CONFIG,
});

export const config = {
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return (configStore as any).get(key);
  },

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    (configStore as any).set(key, value);
  },

  getAll(): AppConfig {
    return configStore.store;
  },

  reset(): void {
    (configStore as any).clear();
    Object.entries(DEFAULT_CONFIG).forEach(([key, value]) => {
      (configStore as any).set(key as keyof AppConfig, value);
    });
  },

  getRefreshInterval(): number {
    return Math.max(30000, (configStore as any).get('refreshInterval', DEFAULT_CONFIG.refreshInterval));
  },

  archiveStory(storyGid: string): void {
    const archived = this.get('archivedStories') || [];
    if (!archived.includes(storyGid)) {
      // Cap the list so it doesn't grow forever (old stories fall out of the window anyway).
      this.set('archivedStories', [...archived, storyGid].slice(-500));
    }
  },

  restoreAllStories(): void {
    this.set('archivedStories', []);
  },
};
