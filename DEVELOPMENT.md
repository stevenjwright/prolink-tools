# Development

## Technology Stack

This project is a cross-platform desktop application built with the following technologies:

*   **Core:** [Electron](https://www.electronjs.org/) (Desktop App), [Node.js](https://nodejs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Frontend:** [React](https://reactjs.org/)
*   **State Management:** [MobX](https://mobx.js.org/)
*   **Styling:** [Emotion](https://emotion.sh/) (CSS-in-JS)
*   **Backend/API:** [Koa](https://koajs.com/)
*   **Bundler:** [Webpack](https://webpack.js.org/)
*   **DJ Link Integration:** `prolink-connect`

## Outputs

The project builds the following components:

1.  **Device Status Panel:** A UI to view players and devices on the Pro DJ Link network.
2.  **Livestream Overlays:** Web-based overlays for use in OBS or other streaming software.
3.  **Website:** A documentation or companion site.

## How to Run in Dev

You can start the development environment using **Yarn**. The `start-dev` script runs all necessary services in parallel.

### Run Everything
```bash
yarn start-dev
```

### Run Individual Services
*   **Main Process:** `yarn start-dev:main`
*   **Renderer (UI):** `yarn start-dev:renderer`
*   **Overlay:** `yarn start-dev:overlay`
*   **Website:** `yarn start-dev:website`
*   **API:** `yarn start-dev:api`
