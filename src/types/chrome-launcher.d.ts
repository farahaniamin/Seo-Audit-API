declare module 'chrome-launcher' {
  export interface ChromeLauncherOptions {
    chromeFlags?: string[];
    logLevel?: string;
  }

  export interface LaunchedChrome {
    port: number;
    pid: number;
    process: any;
    kill(): Promise<void>;
  }

  export function launch(options?: ChromeLauncherOptions): Promise<LaunchedChrome>;
}
