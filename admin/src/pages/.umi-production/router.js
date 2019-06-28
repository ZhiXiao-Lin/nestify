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
    "_title": "文明实践中心",
    "_title_default": "文明实践中心"
  },
  {
    "path": "/user",
    "no_authority": true,
    "redirect": "/user/login",
    "exact": true,
    "_title": "文明实践中心",
    "_title_default": "文明实践中心"
  },
  {
    "path": "/",
    "redirect": "/studio",
    "exact": true,
    "_title": "文明实践中心",
    "_title_default": "文明实践中心"
  },
  {
    "path": "/user",
    "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__user" */'../../layouts/user'),
  
}),
    "routes": [
      {
        "path": "/user/login",
        "no_authority": true,
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__login" */'../user/login'),
  
}),
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "path": "/user/register",
        "no_authority": true,
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__register" */'../user/register'),
  
}),
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "path": "/user/forgot",
        "no_authority": true,
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__forgot" */'../user/forgot'),
  
}),
        "routes": [],
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      }
    ],
    "_title": "文明实践中心",
    "_title_default": "文明实践中心"
  },
  {
    "path": "/studio",
    "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../../layouts/studio'),
  
}),
    "Routes": [require('../Authorized').default],
    "routes": [
      {
        "name": "首页看板",
        "no_authority": true,
        "icon": "dashboard",
        "path": "/studio",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__home" */'../home'),
  
}),
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name_noshow": "站内搜索",
        "path": "/studio/search",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__search" */'../search'),
  
}),
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name": "内容管理",
        "icon": "book",
        "path": "/studio/content",
        "Routes": [require('../Authorized').default],
        "routes": [
          {
            "name": "轮播管理",
            "path": "/studio/content/carousel",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../content/carousel'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name_noshow": "轮播详情",
            "path": "/studio/content/carousel/detail/:id?",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../content/carousel/detail'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name": "文章管理",
            "path": "/studio/content",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../content'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name": "文章分类",
            "path": "/studio/content/category",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../content/category'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name_noshow": "文章详情",
            "path": "/studio/content/detail/:id?",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../content/detail'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          }
        ],
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name": "服务管理",
        "icon": "audit",
        "path": "/studio/service",
        "Routes": [require('../Authorized').default],
        "routes": [
          {
            "name": "服务管理",
            "path": "/studio/service",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../service'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name": "服务分类",
            "path": "/studio/service/category",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../service/category'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name_noshow": "服务详情",
            "path": "/studio/service/detail/:id?",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../service/detail'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          }
        ],
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name": "工单管理",
        "icon": "form",
        "path": "/studio/flow",
        "Routes": [require('../Authorized').default],
        "routes": [
          {
            "name": "流程模板",
            "path": "/studio/flow/template",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../flow/template'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name_noshow": "流程模板详情",
            "path": "/studio/flow/template/detail/:id?",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../flow/template/detail'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name": "流程管理",
            "path": "/studio/flow",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../flow'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name_noshow": "流程详情",
            "path": "/studio/flow/detail/:id?",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../flow/detail'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          }
        ],
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name": "组织架构",
        "icon": "apartment",
        "path": "/studio/organization",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__organization" */'../organization'),
  
}),
        "Routes": [require('../Authorized').default],
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name": "用户管理",
        "icon": "team",
        "path": "/studio/users",
        "Routes": [require('../Authorized').default],
        "routes": [
          {
            "name": "用户列表",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../users'),
  
}),
            "path": "/studio/users",
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name_noshow": "用户详情",
            "path": "/studio/users/detail/:id?",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../users/detail'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          }
        ],
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name": "权限角色",
        "icon": "cluster",
        "path": "/studio/auth",
        "Routes": [require('../Authorized').default],
        "routes": [
          {
            "name": "角色管理",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../auth/role'),
  
}),
            "path": "/studio/auth/role",
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name_noshow": "角色详情",
            "path": "/studio/auth/role/detail/:id?",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../auth/role/detail'),
  
}),
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          },
          {
            "name": "权限管理",
            "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "layouts__studio" */'../auth/authority'),
  
}),
            "path": "/studio/auth/authority",
            "exact": true,
            "_title": "文明实践中心",
            "_title_default": "文明实践中心"
          }
        ],
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name": "站点设置",
        "icon": "setting",
        "path": "/studio/setting",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__setting" */'../setting'),
  
}),
        "Routes": [require('../Authorized').default],
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "name_noshow": "个人设置",
        "no_authority": true,
        "path": "/studio/user/setting",
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__user__setting" */'../user/setting'),
  
}),
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      }
    ],
    "_title": "文明实践中心",
    "_title_default": "文明实践中心"
  },
  {
    "path": "/exception",
    "routes": [
      {
        "path": "/exception/403",
        "no_authority": true,
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__exception__403" */'../exception/403'),
  
}),
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "path": "/exception/404",
        "no_authority": true,
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__exception__404" */'../exception/404'),
  
}),
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      },
      {
        "path": "/exception/500",
        "no_authority": true,
        "component": _dvaDynamic({
  
  component: () => import(/* webpackChunkName: "p__exception__500" */'../exception/500'),
  
}),
        "exact": true,
        "_title": "文明实践中心",
        "_title_default": "文明实践中心"
      }
    ],
    "_title": "文明实践中心",
    "_title_default": "文明实践中心"
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
