import { ipcMain, shell, app, clipboard } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipcChannels';
import { config } from '../store/config';
import { keychain } from '../store/keychain';
import { pollingService } from '../services/polling';
import { trayManager } from '../tray';
import { AsanaClient } from '../api/asana';
import { AppConfig } from '../../shared/types';

export function setupIpcHandlers(): void {
  // ===== Asana data =====

  ipcMain.handle(IPC_CHANNELS.ASANA_GET_DATA, () => pollingService.getData());

  ipcMain.handle(IPC_CHANNELS.ASANA_REFRESH, async () => pollingService.refresh());

  ipcMain.handle(IPC_CHANNELS.ASANA_VALIDATE, async (_, token: string) => {
    // Empty token = validate with the already-saved one (workspace reload).
    const effective = token && token.trim() ? token.trim() : keychain.getToken('asana');
    if (!effective) return { valid: false };
    const client = new AsanaClient(effective);
    const me = await client.validate();
    if (!me) return { valid: false };
    return { valid: true, name: me.name, gid: me.gid, workspaces: me.workspaces };
  });

  // ===== Mentions (local archive) =====

  ipcMain.handle(IPC_CHANNELS.MENTION_ARCHIVE, (_, storyGid: string) => {
    config.archiveStory(String(storyGid));
    pollingService.recalculateStatus();
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.MENTION_RESTORE_ALL, () => {
    config.restoreAllStories();
    pollingService.recalculateStatus();
    return { success: true };
  });

  // ===== Configuration =====

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, (_, key: keyof AppConfig) => config.get(key));

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, (_, key: keyof AppConfig, value: unknown) => {
    // The token never goes through the plain config store; route it to keychain.
    if (key === ('asanaToken' as any)) {
      keychain.saveToken('asana', String(value));
      pollingService.restart();
      return { success: true };
    }

    config.set(key, value as AppConfig[keyof AppConfig]);
    if (key === 'refreshInterval' || key === 'workspaceGid' || key === 'mentionsDays') {
      pollingService.restart();
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET_ALL, () => {
    // Expose whether the token is present, but never its value.
    return {
      ...config.getAll(),
      hasAsanaToken: keychain.hasToken('asana'),
    };
  });

  // ===== Application =====

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, (_, url: string) => shell.openExternal(url));
  ipcMain.handle(IPC_CHANNELS.APP_COPY_TO_CLIPBOARD, (_, text: string) => {
    clipboard.writeText(String(text ?? ''));
    return { success: true };
  });
  ipcMain.handle(IPC_CHANNELS.APP_SHOW_PREFERENCES, () => trayManager.showPreferencesWindow());
  ipcMain.handle(IPC_CHANNELS.APP_QUIT, () => app.quit());
  ipcMain.handle(IPC_CHANNELS.APP_HIDE_MENU, () => trayManager.hideMenuWindow());
}
