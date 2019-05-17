const AUTHORITY = {
	DASHBOARD: 'AUTH-DASHBOARD',
	PRODUCT: 'AUTH-PRODUCT',
	ORDER: 'AUTH-ORDER',
	FINANCE: 'AUTH-FINANCE',
	PROJECT: 'AUTH-PROJECT',
	APPLY: 'AUTH-APPLY',
	CONTENT: 'AUTH-CONTENT',
	ORGANIZATION: 'AUTH-ORGANIZATION',
	USER: 'AUTH-USER',
	MAINDATA: 'AUTH-MAINDATA'
};

export default [
	{
		path: '/user',
		component: '../layouts/user',
		routes: [
			{ path: '/user', redirect: '/user/login' },
			{ path: '/user/login', component: './user/login' },
			{ path: '/user/register', component: './user/register' },
			{
				path: '/user/forgot',
				component: './user/forgot',
				routes: [ { path: '/user/forgot', redirect: '/user/forgot/info' } ]
			}
		]
	},
	{
		path: '/studio',
		component: '../layouts/studio',
		Routes: [ 'src/pages/Authorized' ],
		authority: 100,
		routes: [
			{ path: '/', redirect: '/studio' },
			{
				name: '首页看板',
				authority: AUTHORITY.DASHBOARD,
				icon: 'dashboard',
				path: '/studio',
				component: './home/Index'
			},
			{
				name: '景区动态',
				icon: 'file-text',
				path: '/studio/news/:channel',
				component: './news',
				Routes: [ 'src/pages/Authorized' ],
				authority: AUTHORITY.CONTENT,
				routes: [
					{ name: '官方公告', path: '/studio/news/notice' },
					{ name: '精彩活动', path: '/studio/news/activity' },
					{ name: '新闻动态', path: '/studio/news/trends' }
				]
			},
			{
				name_noshow: '内容详情',
				path: '/studio/contentdetails/:channel',
				component: './contents/content.details'
			},

			{
				name_noshow: '个人设置',
				path: '/studio/user/settings',
				component: './user/settings/Info',
				routes: [
					{
						path: '/studio/user/settings',
						redirect: '/studio/user/settings/base'
					},
					{
						path: '/studio/user/settings/base',
						component: './user/settings/BaseView'
					},
					{
						path: '/studio/user/settings/password',
						component: './user/settings/PasswordView'
					},
					{
						path: '/studio/user/settings/security',
						component: './user/settings/SecurityView'
					},
					{
						path: '/studio/user/settings/binding',
						component: './user/settings/BindingView'
					},
					{
						path: '/studio/user/settings/notification',
						component: './user/settings/NotificationView'
					}
				]
			}
		]
	},
	{
		path: '/exception',
		authority: 0,
		routes: [
			{ path: '/exception/403', component: './Exception/404' },
			{ path: '/exception/404', component: './Exception/403' },
			{ path: '/exception/500', component: './Exception/500' }
		]
	}
];
