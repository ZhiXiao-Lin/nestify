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
        "routes": [],
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
        "name": "景区概况",
        "icon": "book",
        "path": "/studio/survey/:channel",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__content" */'../content'),
  
}),
        "Routes": [require('../Authorized').default],
        "authority": "AUTH-CONTENT",
        "routes": [
          {
            "name": "景区介绍",
            "path": "/studio/survey/景区介绍",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "地理概况",
            "path": "/studio/survey/地理概况",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "人文历史",
            "path": "/studio/survey/人文历史",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "工艺特色",
            "path": "/studio/survey/工艺特色",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "发展规划",
            "path": "/studio/survey/发展规划",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "当地特产",
            "path": "/studio/survey/当地特产",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "特色工艺品",
            "path": "/studio/survey/特色工艺品",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "游览须知",
            "path": "/studio/survey/游览须知",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          }
        ],
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name": "景区风光",
        "icon": "picture",
        "path": "/studio/scenery/:channel",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__content" */'../content'),
  
}),
        "Routes": [require('../Authorized').default],
        "authority": "AUTH-CONTENT",
        "routes": [
          {
            "name": "景点一览",
            "path": "/studio/scenery/景点一览",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "720度全景",
            "path": "/studio/scenery/720度全景",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "电子导游导览",
            "path": "/studio/scenery/电子导游导览",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "摄影佳作",
            "path": "/studio/scenery/摄影佳作",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "视频赏析",
            "path": "/studio/scenery/视频赏析",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          }
        ],
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name": "旅游攻略",
        "icon": "read",
        "path": "/studio/strategy/:channel",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__content" */'../content'),
  
}),
        "Routes": [require('../Authorized').default],
        "authority": "AUTH-CONTENT",
        "routes": [
          {
            "name": "特色餐饮",
            "path": "/studio/strategy/特色餐饮",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "周边住宿",
            "path": "/studio/strategy/周边住宿",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "旅游购物",
            "path": "/studio/strategy/旅游购物",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "周边娱乐",
            "path": "/studio/strategy/周边娱乐",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "游程推荐",
            "path": "/studio/strategy/游程推荐",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "美文游记",
            "path": "/studio/strategy/美文游记",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          }
        ],
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name": "景区动态",
        "icon": "file-text",
        "path": "/studio/news/:channel",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__content" */'../content'),
  
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
          }
        ],
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name_noshow": "详情",
        "path": "/studio/contentdetail/:channel/:id",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__content__detail" */'../content/detail'),
  
}),
        "exact": true,
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name": "联系我们",
        "icon": "contacts",
        "path": "/studio/about/:channel",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__about" */'../about'),
  
}),
        "Routes": [require('../Authorized').default],
        "authority": "AUTH-CONTENT",
        "routes": [
          {
            "name": "联系方式",
            "path": "/studio/about/联系方式",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "留言咨询",
            "path": "/studio/about/留言咨询",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          },
          {
            "name": "投诉建议",
            "path": "/studio/about/投诉建议",
            "exact": true,
            "_title": "方大特钢",
            "_title_default": "方大特钢"
          }
        ],
        "_title": "方大特钢",
        "_title_default": "方大特钢"
      },
      {
        "name": "站点设置",
        "icon": "setting",
        "path": "/studio/setting",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__setting" */'../setting'),
  
}),
        "Routes": [require('../Authorized').default],
        "authority": "AUTH-CONTENT",
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
          }
        ],
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
      }
    ],
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
