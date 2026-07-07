import { contextBridge, ipcRenderer } from 'electron';

const IPC_CHANNELS = {
  ASANA_GET_DATA: 'asana:getData',
  ASANA_REFRESH: 'asana:refresh',
  ASANA_VALIDATE: 'asana:validate',
  MENTION_COMMENT: 'mention:comment',
  MENTION_MARK_SEEN: 'mention:markSeen',
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_GET_ALL: 'config:getAll',
  APP_OPEN_EXTERNAL: 'app:openExternal',
  APP_COPY_TO_CLIPBOARD: 'app:copyToClipboard',
  APP_SHOW_PREFERENCES: 'app:showPreferences',
  APP_QUIT: 'app:quit',
  APP_HIDE_MENU: 'app:hideMenu',
  DATA_UPDATED: 'data:updated',
  REFRESH_STATUS: 'refresh:status',
  ERROR_OCCURRED: 'error:occurred',
};

const api = {
  asana: {
    getData: () => ipcRenderer.invoke(IPC_CHANNELS.ASANA_GET_DATA),
    refresh: () => ipcRenderer.invoke(IPC_CHANNELS.ASANA_REFRESH),
    validate: (token: string) => ipcRenderer.invoke(IPC_CHANNELS.ASANA_VALIDATE, token),
  },

  mentions: {
    comment: (taskGid: string, text: string) => ipcRenderer.invoke(IPC_CHANNELS.MENTION_COMMENT, taskGid, text),
    markSeen: (storyGid: string) => ipcRenderer.invoke(IPC_CHANNELS.MENTION_MARK_SEEN, storyGid),
  },

  config: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET, key),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, key, value),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET_ALL),
  },

  app: {
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),
    copyToClipboard: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_COPY_TO_CLIPBOARD, text),
    showPreferences: () => ipcRenderer.invoke(IPC_CHANNELS.APP_SHOW_PREFERENCES),
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
    hideMenu: () => ipcRenderer.invoke(IPC_CHANNELS.APP_HIDE_MENU),
  },

  on: {
    dataUpdated: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.DATA_UPDATED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.DATA_UPDATED, handler);
    },
    refreshStatus: (callback: (status: string) => void) => {
      const handler = (_: any, status: string) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.REFRESH_STATUS, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.REFRESH_STATUS, handler);
    },
    error: (callback: (error: string) => void) => {
      const handler = (_: any, error: string) => callback(error);
      ipcRenderer.on(IPC_CHANNELS.ERROR_OCCURRED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ERROR_OCCURRED, handler);
    },
  },
};

contextBridge.exposeInMainWorld('asanabar', api);
