# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prolink Tools is an Electron-based desktop application that connects to Pioneer Pro DJ Link equipment (CDJs) to display device status and provide livestream overlays for OBS. It uses `prolink-connect` to communicate with Pioneer DJ gear over the network and provides real-time track information and metadata.

## Common Commands

### Development
```bash
yarn start-dev              # Run all services in parallel
yarn start-dev:main         # Electron main process only
yarn start-dev:renderer     # React UI only
yarn start-dev:overlay      # Overlay web app only
yarn start-dev:website      # Marketing website only
yarn start-dev:api          # Cloud API server only
```

### Production
```bash
yarn build                  # Build all components
yarn start                  # Run built Electron app
yarn start-api              # Run built API server
```

### Quality
```bash
yarn lint                   # Run ESLint on src/
```

### Distribution
```bash
yarn pack                   # Build app to directory (test packaging)
yarn dist                   # Build distributable packages
```

## Architecture Overview

### 5-Component System

This project has **5 independent build outputs**, each with separate webpack configs:

1. **Main Process** (`src/main/`) - Electron main process (Node.js)
   - Owns the canonical AppStore (MobX)
   - Manages ProlinkNetwork connection to CDJs
   - Runs HTTP server for overlays (port 5152)
   - Handles config persistence via electron-settings

2. **Renderer Process** (`src/renderer/`) - Electron UI (React)
   - React app showing device status and config
   - Synced read-only AppStore replica via IPC

3. **Overlay** (`src/overlay/`) - Standalone web app for OBS
   - React app for livestream overlays
   - Connects to overlay server via WebSocket
   - URL: `http://localhost:5152/overlay/<overlay-id>`

4. **Website** (`src/website/`) - Marketing/documentation site
   - Standalone static site (deployed to Vercel)

5. **API Server** (`src/api/`) - Optional cloud service
   - Koa HTTP server with Socket.IO
   - Enables remote access to app state
   - Dual namespace: `/ingest/:apiKey` (app→API) and `/store/:appKey` (client→API)

### State Management

**MobX-based synchronization pattern**:

- **Main process**: Owns canonical `AppStore` instance
- **Renderer/Overlay**: Maintain synced read-only replicas
- **Sync mechanism**: `deepObserve()` captures granular changes → serialized as `SerializedChange` → applied via IPC/WebSocket
- **Bidirectional config**: Config changes in renderer/overlay flow back to main for persistence

Key files:
- `src/shared/store/index.ts` - AppStore root model
- `src/shared/store/ipc.ts` - IPC sync between main ↔ renderer
- `src/shared/store/server.ts` - WebSocket sync main ↔ overlay
- `src/shared/store/client.ts` - Cloud API WebSocket client

### Prolink-Connect Integration

The `prolink-connect` library (Pioneer protocol implementation) is integrated in:

- `src/main/main.ts` - Initialize network with `bringOnline()`, `autoconfigFromPeers()`, `connect()`
- `src/shared/store/network.ts` - Wire up event listeners:
  - `connectDevices()` - Maps CDJs to DeviceStore
  - `connectStatus()` - Listen to CDJStatus updates
  - `connectTracks()` - Fetch metadata/artwork via `network.db`
  - `connectMixstatus()` - Detect "now playing" events
  - `connectLocaldb*()` - Track USB database hydration progress

### Communication Patterns

1. **IPC (Main ↔ Renderer)**:
   - Main sends: `store-init` (full store), `store-update` (diffs)
   - Renderer sends: `config-update` (bidirectional config sync)
   - Uses `async-mutex` to prevent update loops

2. **WebSocket (Main ↔ Overlay)**:
   - Server: `overlayServer.ts` on port 5152
   - Protocol: Socket.IO with `store-init` / `store-update` events

3. **WebSocket (App ↔ Cloud API)**:
   - App connects to `/ingest/:apiKey` namespace
   - Bidirectional: App sends store updates, API can send config commands
   - Includes handshake protocol and latency monitoring

## Key Models

Located in `src/shared/store/`:

- **AppStore** - Root store containing all state
- **DeviceStore** - Per-CDJ state (status, track, artwork, DB hydration)
- **MixstatusStore** - Track history with set markers and "now playing" detection
- **AppConfig** - User settings (persisted to electron-settings)
- **CloudApiState** - API connection state

Uses MobX 6 decorators (`@observable`, `@action`, `@computed`) with `serializr` for serialization.

## Overlay Development

To create a new overlay:

1. Create directory in `src/overlay/overlays/<overlay-name>/`
2. Export a React component with the overlay UI
3. Register in overlay routing
4. Configure in main app UI
5. Add as Browser Source in OBS: `http://localhost:5152/overlay/<overlay-id>`

Reference existing overlays:
- `src/overlay/overlays/nowPlaying/` - Main "Now Playing" overlay
- `src/overlay/overlays/example/` - Template/demo

## Technology Stack

- **Electron 18** - Desktop app framework
- **React 17** - UI rendering
- **TypeScript** - Type safety
- **MobX 6** - Reactive state management
- **Emotion** - CSS-in-JS styling
- **Koa** - API server framework
- **Socket.IO 4** - WebSocket communication
- **Webpack 5** - Module bundler
- **prolink-connect** - Pioneer Pro DJ Link protocol

## Important Notes

- Node version: 18.11.0 (managed via Volta)
- Yarn version: 1.22.19
- The project uses MobX decorators - ensure TypeScript decorators are enabled
- Main process has full Node.js access; renderer runs in browser context
- Overlays are read-only views of the store - they cannot modify config
- The cloud API is optional - app works fully offline
- Use `yarn` (not `npm`) due to specific package resolutions
