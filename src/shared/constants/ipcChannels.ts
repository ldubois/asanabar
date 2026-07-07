export const IPC_CHANNELS = {
  // Asana data
  ASANA_GET_DATA: 'asana:getData',
  ASANA_REFRESH: 'asana:refresh',
  ASANA_VALIDATE: 'asana:validate',

  // Mentions (local archive)
  MENTION_ARCHIVE: 'mention:archive',
  MENTION_RESTORE_ALL: 'mention:restoreAll',

  // Configuration
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_GET_ALL: 'config:getAll',

  // Application
  APP_OPEN_EXTERNAL: 'app:openExternal',
  APP_COPY_TO_CLIPBOARD: 'app:copyToClipboard',
  APP_SHOW_PREFERENCES: 'app:showPreferences',
  APP_QUIT: 'app:quit',
  APP_HIDE_MENU: 'app:hideMenu',

  // Events (main -> renderer)
  DATA_UPDATED: 'data:updated',
  REFRESH_STATUS: 'refresh:status',
  ERROR_OCCURRED: 'error:occurred',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
