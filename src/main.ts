import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { trayManager } from './main/tray';
import { pollingService } from './main/services/polling';
import { setupIpcHandlers } from './main/ipc/handlers';
import { config } from './main/store/config';

// Windows: Squirrel relance l'app pendant install/update pour créer les
// raccourcis ; il faut quitter immédiatement dans ce cas.
if (started) {
  app.quit();
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    trayManager.showPreferencesWindow();
  });

  if (process.platform === 'darwin') {
    app.dock?.hide();
  }

  app.whenReady().then(() => {
    // En dev, setLoginItemSettings enregistrerait le binaire Electron nu.
    if (app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: config.get('launchAtStartup') === true });
    }

    setupIpcHandlers();
    trayManager.initialize();

    pollingService.start((data) => {
      trayManager.updateFromData(data);
    });

    app.on('refresh-data' as any, () => {
      pollingService.refresh();
    });
  });

  app.on('window-all-closed', () => {
    // Do nothing to keep the app open
  });

  app.on('before-quit', () => {
    pollingService.stop();
    trayManager.destroy();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      trayManager.showPreferencesWindow();
    }
  });
}
