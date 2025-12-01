import 'regenerator-runtime/runtime';

import {app, BrowserWindow, nativeTheme, shell} from 'electron';
import {reaction, runInAction, set, when} from 'mobx';
import fetch from 'node-fetch';
import {bringOnline, NetworkState, ProlinkNetwork} from 'prolink-connect';

import * as path from 'path';
import * as url from 'url';

import {runConfigMigrations} from 'main/configMigrations';
import {registerDebuggingEventsService} from 'main/debugEvents';
import {setupMenu} from 'main/menu';
import {startOverlayServer} from 'main/overlayServer';
import {setupSaveHistory} from 'main/saveHistory';
import {userInfo} from 'src/shared/sentry/main';
import {AppStore, createAppStore} from 'src/shared/store';
import {observeStore} from 'src/shared/store/ipc';
import connectNetworkStore from 'src/shared/store/network';
import {
  loadMainConfig,
  observerAndPersistConfig,
  persistConfig,
  registerMainIpc,
  registerMainWebsocket,
  startMainApiWebsocket,
} from 'src/shared/store/server';
import theme from 'src/theme';

if (!globalThis.fetch) {
  globalThis.fetch = fetch as any;
}

export const isDev = process.env.NODE_ENV !== 'production';

const mainStore = createAppStore();

export const withMainStore = (cb: (store: AppStore) => void) => cb(mainStore);

// Update the store with user details ASAP
(async () => {
  const user = await userInfo;
  runInAction(() => set(mainStore, {user}));
})();

// Intialize the store for the main thread immedaitely.
runInAction(() => (mainStore.isInitalized = true));

// Setup application menu
setupMenu(mainStore);

// Setup theme from configuration
reaction(
  () => mainStore.config.theme,
  schema => {
    nativeTheme.themeSource = schema;

    const bg = nativeTheme.shouldUseDarkColors
      ? theme.dark.background
      : theme.light.background;
    win?.setBackgroundColor(bg);
  },
  {fireImmediately: true}
);

// Require overlay main functionality
require('src/overlay/overlays/nowPlaying/main');

let win: BrowserWindow | null;

const createWindow = () => {
  win = new BrowserWindow({
    width: 920,
    minWidth: 700,
    height: 900,
    titleBarStyle: 'hiddenInset',
    title: 'Prolink Tools',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'sentry.js'),
    },
    backgroundColor: nativeTheme.shouldUseDarkColors
      ? theme.dark.background
      : theme.light.background,
  });

  win.on('closed', () => (win = null));

  // Always open dev tools for debugging
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';
  win.webContents.once('dom-ready', () => win!.webContents.openDevTools());

  const indexUrl = isDev
    ? 'http://127.0.0.1:2003/index.html'
    : url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true,
      });

  win.loadURL(indexUrl);

  win.webContents.on('will-navigate', (e, url) => {
    if (win && url !== win.webContents.getURL() && url.startsWith('http')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
};

app.on('ready', async () => {
  console.log('[Main] App ready event fired');

  try {
    await loadMainConfig(mainStore);
    console.log('[Main] Config loaded');

    observerAndPersistConfig(mainStore);
    mainStore.config.ensureDefaults();
    runConfigMigrations(mainStore);
    console.log('[Main] Config initialized');

    createWindow();
    console.log('[Main] Window created');

    const [register] = observeStore({target: mainStore});
    registerMainIpc(mainStore, register);
    console.log('[Main] IPC registered');

    let network: ProlinkNetwork | undefined;

    // Open connections to the network
    console.log('[Main] Attempting to bring network online...');
    try {
      network = await bringOnline();
      console.log('[Main] Network brought online successfully');
    mainStore.markNetworkState(network.state);

    // Attempt to autoconfigure from other devices on the network
    await network.autoconfigFromPeers();
    network.connect();
    mainStore.markNetworkState(network.state);
    console.log('[Main] Network configured and connected');
  } catch (e: any) {
    console.log('[Main] Network connection failed:', e);
    if (e.code !== 'EADDRINUSE') {
      console.error('[Main] Unexpected network error, rethrowing:', e);
      throw e;
    }

    // Something is using the status port... Most likely rekordbox
    console.log('[Main] Port in use (EADDRINUSE), marking network as failed');
    mainStore.markNetworkState(NetworkState.Failed);
  }

  console.log('[Main] About to start overlay server...');
  // Start overlay http / websocket server.
  //
  // XXX: Becuase of a strange bug in MacOS's firewall dialog, if two
  // connections are opened at the same time before the program is given
  // permission to open connections, when the software is closed the kernel
  // will not correctly close one of the ports.
  //
  // Because the `network.bringOnline` will block until connected we ensure two
  // are not opened
  //
  // As thus THIS LINE MUST BE PLACED AFTER THE NETWORK IS BROUGHT ONLINE.
  //
  const httpServer = await startOverlayServer();
  console.log('[Main] Overlay server started successfully');

  // Start the main websocket on the overlay server (this doesn't depend on DJ network)
  registerMainWebsocket(mainStore, httpServer, register);
  console.log('[Main] Overlay WebSocket registered');

  // Only set up network-dependent features if network is available
  if (network) {
    console.log('[Main] Setting up network-dependent features...');

    // Connect to api.prolink.tools when enabled
    reaction(
      () => mainStore.config.cloudTools.enabled,
      enabled => {
        if (enabled) {
          const disconnect = startMainApiWebsocket(mainStore, register);
          when(() => mainStore.config.cloudTools.enabled === false, disconnect);
        }
      },
      {fireImmediately: true}
    );

    connectNetworkStore(mainStore, network);
    registerDebuggingEventsService(mainStore, network);
    setupSaveHistory(mainStore);
    console.log('[Main] Network-dependent features set up');
  } else {
    console.log('[Main] Skipping network-dependent features (network unavailable)');
  }

  console.log('[Main] App startup complete');
  } catch (error) {
    console.error('[Main] FATAL ERROR during app startup:', error);
    throw error;
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

app.on('will-quit', async event => {
  const didMark = mainStore.config.markLatestVersion();

  if (didMark) {
    event.preventDefault();
    await persistConfig(mainStore);
    app.quit();
  }
});
