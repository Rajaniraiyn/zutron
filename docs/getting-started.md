## Getting Started

Install Zutron and peer dependencies:

```bash
npm i zutron zustand
```

Or use your dependency manager of choice, e.g. `pnpm`, `yarn`.

The following instructions assume you are using TypeScript. First, create your Zustand store using `zustand/vanilla` in the main process:

```ts
import { createStore } from 'zustand/vanilla';

store = createStore<AppState>()(() => initialState);
```

Then initialise the bridge in the main process. The bridge needs your store, ipcMain and an array of BrowserWindow objects for your app, so for a single window application:

```ts
import { ipcMain, type BrowserWindow } from 'electron';
import { mainZustandBridge } from 'zutron/main';

// create mainWindow

const { unsubscribe } = mainZustandBridge(ipcMain, store, [mainWindow]);

app.on('quit', unsubscribe);
```

Next initialise the bridge in the preload script. Here the bridge needs the State type and the ipcRenderer. The bridge initialiser will return a set of handlers which should be exposed to the renderer process via the `contextBridge` module.

```ts
import { ipcRenderer, contextBridge } from 'electron';
import { preloadZustandBridge } from 'zutron/preload';

import type { State } from '../features/index.js';

export const { handlers } = preloadZustandBridge<State>(ipcRenderer);

contextBridge.exposeInMainWorld('zutron', handlers);
```

Finally, in the renderer process you will need to create some hooks:

`/renderer/hooks/useStore.ts`

```ts
import { createUseStore } from 'zutron';
import { State } from '../../features/index.js';

export const useStore = createUseStore<State>(window.zutron);
```

`/renderer/hooks/useDispatch.ts`

```ts
export const useDispatch = () => window.zutron.dispatch;
```

### Accessing the Store in the Renderer Process

In the renderer process you should now be able to access the store via the `useStore` hook:

```ts
const counter = useStore((x) => x.counter);
```

You can use the `useDispatch` hook to dispatch actions and thunks to the store:

```ts
const dispatch = useDispatch();
const onIncrement = () => dispatch('COUNTER:INCREMENT');
```

If you are using a thunk the dispatch function and the store are passed in:

```ts
const dispatch = useDispatch();
const onIncrement = () =>
  dispatch((dispatch, store) => {
    // do something based on the store
    dispatch('COUNTER:INCREMENT');
  });
```

### Accessing the Store in the Main Process

In the main process you can access the store object directly. You can also use the dispatch helper in a similar way to the renderer hook:

```ts
import { createDispatch } from 'zutron/main';

dispatch = createDispatch(store);

dispatch('COUNTER:INCREMENT');
```

The dispatch helper supports some different ways of structuring your store. By default it assumes your store actions / handlers are located on the store.

If you keep your store actions / handlers separate from the store then you will need to pass them in as an option:

```ts
import { handlers as counterHandlers } from '../../features/counter/index.js';
import { handlers as uiHandlers } from '../../features/ui/index.js';

const actionHandlers = (store: AppStore, initialState: AppState) => ({
  ...counterHandlers(store),
  ...uiHandlers(store),
  'STORE:RESET': () => store.setState(initialState, true),
});

dispatch = createDispatch(store, { handlers: actionHandlers(store, initialState) });
```

Alternatively if you are using Redux-style reducers you will need to pass the root reducer in as an option:

```ts
import { reducer as counterReducer } from '../../features/counter/index.js';
import { reducer as uiReducer } from '../../features/ui/index.js';

const rootReducer = (state, action) => {
  switch (action.type) {
    case types.counter:
      return counterReducer(state.counter, action);
    case types.ui:
      return uiReducer(state.ui, action);
  }
};

dispatch = createDispatch(store, { reducer: rootReducer });
```