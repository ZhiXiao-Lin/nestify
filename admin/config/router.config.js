export default [
  {
    path: '/user',
    component: '../layouts/user',
    routes: [
      { path: '/user', no_authority: true, redirect: '/user/login' },
      { path: '/user/login', no_authority: true, component: './user/login' },
      { path: '/user/register', no_authority: true, component: './user/register' },
      {
        path: '/user/forgot',
        no_authority: true,
        component: './user/forgot',
        routes: [{ path: '/user/forgot', redirect: '/user/forgot/info' }],
      },
    ],
  },
  {
    path: '/studio',
    component: '../layouts/studio',
    Routes: ['src/pages/Authorized'],
    routes: [
      { path: '/', redirect: '/studio' },
      {
        name: '首页看板',
        no_authority: true,
        icon: 'dashboard',
        path: '/studio',
        component: './home',
      },
      {
        name_noshow: '站内搜索',
        path: '/studio/search',
        component: './search',
      },
      {
        name: '内容管理',
        icon: 'book',
        path: '/studio/content',
        Routes: ['src/pages/Authorized'],
        routes: [
          { name: '轮播管理', path: '/studio/content/carousel', component: './content/carousel' },
          {
            name_noshow: '轮播详情',
            path: '/studio/content/carousel/detail/:id?',
            component: './content/carousel/detail',
          },
          { name: '文章管理', path: '/studio/content/list', component: './content' },
          { name: '文章分类', path: '/studio/content/category', component: './content/category' },
          {
            name_noshow: '文章详情',
            path: '/studio/content/detail/:id?',
            component: './content/detail',
          },
        ],
      },
      {
        name: '服务管理',
        icon: 'audit',
        path: '/studio/service',
        Routes: ['src/pages/Authorized'],
        routes: [
          { name: '服务列表', path: '/studio/service/list', component: './service' },
          { name: '服务分类', path: '/studio/service/category', component: './service/category' },
          {
            name_noshow: '服务详情',
            path: '/studio/service/detail/:id?',
            component: './service/detail',
          },
        ],
      },
      {
        name: '工单管理',
        icon: 'form',
        path: '/studio/flow',
        Routes: ['src/pages/Authorized'],
        routes: [
          { name: '流程模板', path: '/studio/flow/template', component: './flow/template' },
          {
            name_noshow: '流程模板详情',
            path: '/studio/flow/template/detail/:id?',
            component: './flow/template/detail',
          },
          { name: '流程审批', path: '/studio/flow/list', component: './flow' },
          {
            name_noshow: '流程详情',
            path: '/studio/flow/detail/:id?',
            component: './flow/detail',
          },
        ],
      },
      {
        name: '组织架构',
        icon: 'apartment',
        path: '/studio/organization',
        component: './organization',
        Routes: ['src/pages/Authorized'],
      },
      {
        name: '用户管理',
        icon: 'team',
        path: '/studio/users',
        Routes: ['src/pages/Authorized'],
        routes: [
          { name: '用户列表', component: './users', path: '/studio/users/list' },
          {
            name_noshow: '用户详情',
            path: '/studio/users/detail/:id?',
            component: './users/detail',
          },
        ],
      },

      {
        name: '权限角色',
        icon: 'cluster',
        path: '/studio/auth',
        Routes: ['src/pages/Authorized'],
        routes: [
          { name: '角色管理', component: './auth/role', path: '/studio/auth/role' },
          {
            name_noshow: '角色详情',
            path: '/studio/auth/role/detail/:id?',
            component: './auth/role/detail',
          },
          { name: '权限管理', component: './auth/authority', path: '/studio/auth/authority' },
        ],
      },
      {
        name: '意见反馈',
        icon: 'question-circle',
        path: '/studio/feedback',

        Routes: ['src/pages/Authorized'],
        routes: [
          { name: '意见反馈列表', component: './feedback', path: '/studio/feedback/list' },
          {
            name_noshow: '意见详情',
            path: '/studio/feedback/detail/:id?',
            component: './feedback/detail',
          },
        ],
      },
      {
        name: '站点设置',
        icon: 'setting',
        path: '/studio/setting',
        component: './setting',
        Routes: ['src/pages/Authorized'],
      },
      {
        name_noshow: '个人设置',
        no_authority: true,
        path: '/studio/user/setting',
        component: './user/setting',
      },
    ],
  },
  {
    path: '/exception',
    routes: [
      { path: '/exception/403', no_authority: true, component: './exception/403' },
      { path: '/exception/404', no_authority: true, component: './exception/404' },
      { path: '/exception/500', no_authority: true, component: './exception/500' },
    ],
  },
];
