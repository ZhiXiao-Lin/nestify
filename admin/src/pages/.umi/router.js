import React from 'react';
import { Router as DefaultRouter, Route, Switch } from 'react-router-dom';
import dynamic from 'umi/dynamic';
import renderRoutes from 'umi/_renderRoutes';
import _dvaDynamic from 'dva/dynamic'

let Router = require('dva/router').routerRedux.ConnectedRouter;

let routes = [
  {
    "path": "/user/forgot",
    "redirect": "/user/forgot/info",
    "exact": true,
    "_title": "方大特钢",
    "_title_default": "方大特钢"
  },
  {
    "path": "/user",
    "redirect": "/user/login",
    "exact": true,
    "_title": "方大特钢",
    "_title_default": "方大特钢"
  },
  {
    "path": "/studio/user/settings",
    "redirect": "/studio/user/settings/base",
    "exact": true,
    "_title": "方大特钢",
    "_title_default": "方大特钢"
  },
  {
    "path": "/",
    "redirect": "/studio",
    "exact": true,
    "_title": "方大特钢",
    "_title_default": "方大特钢"
  },
  {
    "path": "/user",
    "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__user" */'../../layouts/user'),
  
}),
    "routes": [
      {
        "path": "/user/login",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__login" */'../user/login'),
  
}),
        "exact": true,
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "path": "/user/register",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__register" */'../user/register'),
  
}),
        "exact": true,
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "path": "/user/forgot",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__forgot" */'../user/forgot'),
  
}),
        "routes": [
          {
            "component": () => React.createElement(require('D:/code/nestify/admin/node_modules/umi-build-dev/lib/plugins/404/NotFound.js').default, { pagesPath: 'src/pages', hasRoutesInConfig: true }),
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          }
        ],
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "component": () => React.createElement(require('D:/code/nestify/admin/node_modules/umi-build-dev/lib/plugins/404/NotFound.js').default, { pagesPath: 'src/pages', hasRoutesInConfig: true }),
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      }
    ],
    "_title": "方大特钢",
    "_title_default": "方大特钢"
  },
  {
    "path": "/studio",
    "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../../layouts/studio'),
  
}),
    "Routes": [require('../Authorized').default],
    "authority": 100,
    "routes": [
      {
        "name": "首页看板",
        "authority": "AUTH-DASHBOARD",
        "icon": "dashboard",
        "path": "/studio",
        "component": _dvaDynamic({
  app: window.g_app,
models: () => [
  import(/* webpackChunkName: 'p__home__models__chart.js' */'D:/code/nestify/admin/src/pages/home/models/chart.js').then(m => { return { namespace: 'chart',...m.default}})
],
  component: () => import(/* webpackChunkName: "p__home__Index" */'../home/Index'),
  
}),
        "exact": true,
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name": "景区动态",
        "icon": "file-text",
        "path": "/studio/news/:channel",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__news" */'../news'),
  
}),
        "Routes": [require('../Authorized').default],
        "authority": "AUTH-CONTENT",
        "routes": [
          {
            "name": "官方公告",
            "path": "/studio/news/官方公告",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "精彩活动",
            "path": "/studio/news/精彩活动",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "新闻动态",
            "path": "/studio/news/新闻动态",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "component": () => React.createElement(require('D:/code/nestify/admin/node_modules/umi-build-dev/lib/plugins/404/NotFound.js').default, { pagesPath: 'src/pages', hasRoutesInConfig: true }),
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          }
        ],
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name_noshow": "内容详情",
        "path": "/studio/contentdetails/:channel",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__contents__content.details" */'../contents/content.details'),
  
}),
        "exact": true,
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name_noshow": "个人设置",
        "path": "/studio/user/settings",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__settings__Info" */'../user/settings/Info'),
  
}),
        "routes": [
          {
            "path": "/studio/user/settings/base",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__settings__Info" */'../user/settings/BaseView'),
  
}),
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "path": "/studio/user/settings/password",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__settings__Info" */'../user/settings/PasswordView'),
  
}),
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "path": "/studio/user/settings/security",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__settings__Info" */'../user/settings/SecurityView'),
  
}),
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "path": "/studio/user/settings/binding",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__settings__Info" */'../user/settings/BindingView'),
  
}),
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "path": "/studio/user/settings/notification",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__settings__Info" */'../user/settings/NotificationView'),
  
}),
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "component": () => React.createElement(require('D:/code/nestify/admin/node_modules/umi-build-dev/lib/plugins/404/NotFound.js').default, { pagesPath: 'src/pages', hasRoutesInConfig: true }),
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          }
        ],
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "component": () => React.createElement(require('D:/code/nestify/admin/node_modules/umi-build-dev/lib/plugins/404/NotFound.js').default, { pagesPath: 'src/pages', hasRoutesInConfig: true }),
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      }
    ],
    "_title": "方大特钢",
    "_title_default": "方大特钢"
  },
  {
    "path": "/exception",
    "authority": 0,
    "routes": [
      {
        "path": "/exception/403",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__Exception__404" */'../Exception/404'),
  
}),
        "exact": true,
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "path": "/exception/404",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__Exception__403" */'../Exception/403'),
  
}),
        "exact": true,
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "path": "/exception/500",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__Exception__500" */'../Exception/500'),
  
}),
        "exact": true,
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "component": () => React.createElement(require('D:/code/nestify/admin/node_modules/umi-build-dev/lib/plugins/404/NotFound.js').default, { pagesPath: 'src/pages', hasRoutesInConfig: true }),
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      }
    ],
    "_title": "方大特钢",
    "_title_default": "方大特钢"
  },
  {
    "component": () => React.createElement(require('D:/code/nestify/admin/node_modules/umi-build-dev/lib/plugins/404/NotFound.js').default, { pagesPath: 'src/pages', hasRoutesInConfig: true }),
    "_title": "方大特钢",
    "_title_default": "方大特钢"
  }
];
window.g_plugins.applyForEach('patchRoutes', { initialValue: routes });

export default function RouterWrapper() {
  return (
<Router history={window.g_history}>
      { renderRoutes(routes, {}) }
    </Router>
  );
}
