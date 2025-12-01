import 'regenerator-runtime/runtime';
import 'src/shared/sentry/web';

import {Global, css} from '@emotion/react';
import {render} from 'react-dom';
import {io} from 'socket.io-client';

import Router from 'overlay/Router';
import {createAppStore} from 'src/shared/store';
import {registerWebsocketListener} from 'src/shared/store/client';
import {StoreContext} from 'src/shared/store/context';
import {AppOverlayClientSocket} from 'src/shared/websockeTypes';
import AeonikBPLiveFont from 'src/assets/fonts/AeonikBPLive.ttf';

const overlaysStore = createAppStore();

const mainElement = document.createElement('div');
document.body.appendChild(mainElement);

const globalStyles = css`
  @font-face {
    font-family: 'Aeonik BP Live';
    src: url(${AeonikBPLiveFont}) format('truetype');
    font-weight: normal;
    font-style: normal;
  }
`;

const main = (
  <StoreContext.Provider value={overlaysStore}>
    <Global styles={globalStyles} />
    <Router />
  </StoreContext.Provider>
);

render(main, mainElement);

registerWebsocketListener(overlaysStore, io() as AppOverlayClientSocket);
