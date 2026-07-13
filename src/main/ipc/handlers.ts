import { ipcMain, shell, app, clipboard } from 'electron';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { IPC_CHANNELS } from '../../shared/constants/ipcChannels';
import { config } from '../store/config';
import { keychain } from '../store/keychain';
import { pollingService, buildAsanaClient } from '../services/polling';
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

  // ===== Mentions =====

  ipcMain.handle(IPC_CHANNELS.MENTION_COMMENT, async (_, taskGid: string, text: string) => {
    const client = buildAsanaClient();
    if (!client) return { success: false, error: 'Asana non configuré' };
    const body = String(text ?? '').trim();
    if (!body) return { success: false, error: 'Commentaire vide' };
    const ok = await client.addComment(String(taskGid), body);
    // Replying marks the mention as handled: refresh in the background.
    if (ok) pollingService.refresh();
    return ok ? { success: true } : { success: false, error: "Échec de l'envoi" };
  });

  ipcMain.handle(IPC_CHANNELS.MENTION_MARK_SEEN, async (_, storyGid: string) => {
    const client = buildAsanaClient();
    if (!client) return { success: false, error: 'Asana non configuré' };
    const ok = await client.likeStory(String(storyGid));
    if (ok) pollingService.refresh();
    return ok ? { success: true } : { success: false, error: 'Échec du like' };
  });

  // ===== Tasks =====

  // Opens a Warp session in the configured project dir and runs the configured
  // command (e.g. `claude "/asana-task <url>"`). Warp has no CLI for this: the
  // supported way is a Tab Config TOML opened via warp://tab_config/<name>,
  // which adds a tab to the ACTIVE window (launch configurations always spawn
  // a separate window). Warp re-reads the file on every launch, so we rewrite
  // it with the task URL baked in each time.
  ipcMain.handle(IPC_CHANNELS.TASK_OPEN_IN_WARP, async (_, taskUrl: string) => {
    try {
      const url = String(taskUrl ?? '').trim();
      if (!/^https:\/\/app\.asana\.com\//.test(url)) {
        return { success: false, error: 'URL Asana invalide' };
      }
      const home = os.homedir();
      const projectDir = String(config.get('warpProjectDir') || '').trim().replace(/^~(?=\/|$)/, home);
      const template = String(config.get('warpCommand') || '').trim();
      if (!projectDir || !template) {
        return { success: false, error: 'Warp non configuré (réglages → Général)' };
      }
      const command = template.split('{url}').join(url);

      const tomlQuote = (v: string) => '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
      // Mirrors the hand-made ~/.warp/tab_configs/grenouille.toml so the tab
      // looks like any other grenouille session (title, green color).
      const toml = [
        'name = "asanabar-task"',
        'title = ' + tomlQuote(path.basename(projectDir)),
        'color = "green"',
        '',
        '[[panes]]',
        'id = "main"',
        'type = "terminal"',
        'directory = ' + tomlQuote(projectDir),
        'commands = [' + tomlQuote(command) + ']',
        '',
      ].join('\n');

      // Windows : Warp lit les Tab Configs dans %APPDATA%\warp\Warp\data.
      const configDir = process.platform === 'win32'
        ? path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'warp', 'Warp', 'data', 'tab_configs')
        : path.join(home, '.warp', 'tab_configs');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'asanabar-task.toml'), toml, 'utf8');

      await shell.openExternal('warp://tab_config/asanabar-task');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Échec du lancement Warp' };
    }
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
    if (key === 'launchAtStartup' && app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: value === true });
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
