/**
 * Type definitions for Firefox WebExtensions API
 */

declare namespace browser {
  namespace storage {
    interface StorageArea {
      get(keys?: string | string[] | null): Promise<{ [key: string]: any }>;
      set(items: { [key: string]: any }): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    }

    const local: StorageArea;
    const sync: StorageArea;
  }

  namespace runtime {
    function sendMessage(message: any, callback?: (response: any) => void): void;
    function onMessage: {
      addListener(
        callback: (
          message: any,
          sender: any,
          sendResponse: (response: any) => void
        ) => boolean | void
      ): void;
    };
  }

  namespace webRequest {
    interface RequestDetails {
      url: string;
      requestId: string;
      [key: string]: any;
    }

    interface BlockingResponse {
      cancel?: boolean;
      redirectUrl?: string;
      [key: string]: any;
    }

    function onBeforeRequest: {
      addListener(
        callback: (details: RequestDetails) => BlockingResponse | void,
        filter: { urls: string[] },
        extraInfoSpec?: string[]
      ): void;
    };
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      [key: string]: any;
    }

    function create(createProperties: { url: string; [key: string]: any }): Promise<Tab>;
    function query(queryInfo: { [key: string]: any }): Promise<Tab[]>;
  }
}

declare const browser: typeof browser;
