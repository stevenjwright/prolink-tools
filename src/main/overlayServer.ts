import connect from 'connect';
import httpProxy from 'http-proxy';
import httpStatic from 'node-static';

import fs from 'fs';
import http from 'http';
import * as path from 'path';

import {WEBSERVER_PORT} from 'src/shared/constants';

import {isDev, withMainStore} from './main';

// Debug logging helper
const debugLog = (...args: any[]) => {
  withMainStore(store => {
    if (store.config.debugLogging) {
      console.log(...args);
    }
  });
};

// In development, overlay files are in dist/overlay
// In production, overlay files are in Resources/overlay (extraResources)
const OVERLAY_ROOT = isDev
  ? path.resolve(__dirname, 'overlay')
  : path.join(process.resourcesPath, 'overlay');

export async function startOverlayServer() {
  debugLog('[Overlay Server] Starting overlay server...');
  debugLog('[Overlay Server] isDev:', isDev);
  debugLog('[Overlay Server] __dirname:', __dirname);
  debugLog('[Overlay Server] process.resourcesPath:', process.resourcesPath);
  debugLog('[Overlay Server] OVERLAY_ROOT:', OVERLAY_ROOT);
  debugLog('[Overlay Server] WEBSERVER_PORT:', WEBSERVER_PORT);

  // Check if overlay directory exists
  try {
    const stats = fs.statSync(OVERLAY_ROOT);
    debugLog('[Overlay Server] Overlay directory exists:', stats.isDirectory());
    const files = fs.readdirSync(OVERLAY_ROOT);
    debugLog('[Overlay Server] Files in overlay directory:', files);
  } catch (err) {
    console.error('[Overlay Server] Error accessing overlay directory:', err);
  }

  const app = connect();
  const httpServer = http.createServer(app);

  const proxy = httpProxy.createProxy();
  const fileServer = new httpStatic.Server(OVERLAY_ROOT);

  const handler: http.RequestListener = isDev
    ? (req, resp) => proxy.web(req, resp, {target: `http://127.0.0.1:2005/`, ws: true})
    : async (req, resp) => {
        const requestUrl = req.url?.replace(/^\//, '');

        const accessErr = await new Promise<NodeJS.ErrnoException | null>(resolve =>
          fs.stat(path.resolve(OVERLAY_ROOT, requestUrl ?? ''), resolve)
        );

        if (requestUrl !== undefined && accessErr !== null) {
          fileServer.serveFile('index.html', 200, {}, req, resp);
        } else {
          fileServer.serve(req, resp);
        }
      };

  app.use(handler);

  // Start listening for connections
  await new Promise<void>((resolve, reject) => {
    httpServer.on('error', (err: any) => {
      console.error('[Overlay Server] Error starting server:', err);
      reject(err);
    });

    httpServer.listen(WEBSERVER_PORT, '0.0.0.0', () => {
      debugLog(`[Overlay Server] Server listening on http://0.0.0.0:${WEBSERVER_PORT}`);
      resolve();
    });
  });

  return httpServer;
}
