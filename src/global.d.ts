interface AsanaBarAPI {
  asana: {
    getData: () => Promise<any>;
    refresh: () => Promise<any>;
    validate: (token: string) => Promise<{
      valid: boolean;
      name?: string;
      gid?: string;
      workspaces?: { gid: string; name: string }[];
    }>;
  };

  mentions: {
    archive: (storyGid: string) => Promise<{ success: boolean }>;
    restoreAll: () => Promise<{ success: boolean }>;
  };

  config: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<any>;
    getAll: () => Promise<any>;
  };

  app: {
    openExternal: (url: string) => Promise<any>;
    copyToClipboard: (text: string) => Promise<{ success: boolean }>;
    showPreferences: () => Promise<any>;
    quit: () => Promise<any>;
    hideMenu: () => Promise<any>;
  };

  on: {
    dataUpdated: (callback: (data: any) => void) => () => void;
    refreshStatus: (callback: (status: string) => void) => () => void;
    error: (callback: (error: string) => void) => () => void;
  };
}

interface Window {
  asanabar: AsanaBarAPI;
}
