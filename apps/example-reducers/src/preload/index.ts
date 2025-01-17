import { contextBridge } from 'electron';

import { preloadZustandBridge } from 'zutron/preload';
import 'wdio-electron-service/preload';
import type { Handlers } from 'zutron';

import type { State } from '../features/index.js';

export const { handlers } = preloadZustandBridge<State>();

contextBridge.exposeInMainWorld('zutron', handlers);

declare global {
  interface Window {
    zutron: Handlers<State>;
  }
}
