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
        component: './content',
        Routes: ['src/pages/Authorized'],
        routes: [
          { name: '文章管理', path: '/studio/content' },
          { name: '文章分类', path: '/studio/content/category' },

        ],
      },
      {
        name_noshow: '文章详情',
        path: '/studio/contentdetail/:id',
        component: './content/detail',
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
        path: '/studio/users/:channel',
        component: './users',
        Routes: ['src/pages/Authorized'],
        routes: [{ name: '用户列表', path: '/studio/users/customer' }],
      },
      {
        name_noshow: '详情',
        path: '/studio/usersdetail/:channel/:id',
        component: './users/detail',
      },
      {
        name: '权限角色',
        icon: 'cluster',
        path: '/studio/auth',
        Routes: ['src/pages/Authorized'],
        routes: [
          { name: '角色管理', component: './auth/role', path: '/studio/auth/role' },
          { name: '权限管理', component: './auth/authority', path: '/studio/auth/authority' },
        ],
      },
      {
        name_noshow: '详情',
        path: '/studio/roledetail/:id',
        component: './auth/role/detail',
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
