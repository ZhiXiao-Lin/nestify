import './polyfills';

import '@tmp/initHistory';
import React from 'react';
import ReactDOM from 'react-dom';


// runtime plugins
window.g_plugins = require('umi/_runtimePlugin');
window.g_plugins.init({
  validKeys: ['patchRoutes','render','rootContainer','modifyRouteProps','dva',],
});
window.g_plugins.use(require('../../../node_modules/umi-plugin-dva/lib/runtime'));
window.g_plugins.use(require('@/app'));

require('@tmp/initDva');

// render
let oldRender = () => {
  const rootContainer = window.g_plugins.apply('rootContainer', {
    initialValue: React.createElement(require('./router').default),
  });
  ReactDOM.render(
    rootContainer,
    document.getElementById('root'),
  );
};
const render = window.g_plugins.compose('render', { initialValue: oldRender });

const moduleBeforeRendererPromises = [];

Promise.all(moduleBeforeRendererPromises).then(() => {
  render();
}).catch((err) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }
});

require('../../global.css');

// hot module replacement
if (module.hot) {
  module.hot.accept('./router', () => {
    oldRender();
  });
}
