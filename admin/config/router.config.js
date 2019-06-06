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
				routes: [{ path: '/user/forgot', redirect: '/user/forgot/info' }]
			}
		]
	},
	{
		path: '/studio',
		component: '../layouts/studio',
		Routes: ['src/pages/Authorized'],
		authority: 100,
		routes: [
			{ path: '/', redirect: '/studio' },
			{
				name: '首页看板',
				authority: AUTHORITY.DASHBOARD,
				icon: 'dashboard',
				path: '/studio',
				component: './home'
			},
			{
				name: '景区概况',
				icon: 'book',
				path: '/studio/survey/:channel',
				component: './content',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT,
				routes: [
					{ name: '景区介绍', path: '/studio/survey/景区介绍' },
					{ name: '地理概况', path: '/studio/survey/地理概况' },
					{ name: '人文历史', path: '/studio/survey/人文历史' },
					{ name: '工艺特色', path: '/studio/survey/工艺特色' },
					{ name: '发展规划', path: '/studio/survey/发展规划' },
					{ name: '当地特产', path: '/studio/survey/当地特产' },
					{ name: '特色工艺品', path: '/studio/survey/特色工艺品' },
					{ name: '游览须知', path: '/studio/survey/游览须知' },
				]
			},

			{
				name: '景区风光',
				icon: 'picture',
				path: '/studio/scenery/:channel',
				component: './content',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT,
				routes: [
					{ name: '景点一览', path: '/studio/scenery/景点一览' },
					{ name: '720度全景', path: '/studio/scenery/720度全景' },
					{ name: '电子导游导览', path: '/studio/scenery/电子导游导览' },
					{ name: '摄影佳作', path: '/studio/scenery/摄影佳作' },
					{ name: '视频赏析', path: '/studio/scenery/视频赏析' },
				]
			},

			{
				name: '旅游攻略',
				icon: 'read',
				path: '/studio/strategy/:channel',
				component: './content',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT,
				routes: [
					{ name: '特色餐饮', path: '/studio/strategy/特色餐饮' },
					{ name: '周边住宿', path: '/studio/strategy/周边住宿' },
					{ name: '旅游购物', path: '/studio/strategy/旅游购物' },
					{ name: '周边娱乐', path: '/studio/strategy/周边娱乐' },
					{ name: '游程推荐', path: '/studio/strategy/游程推荐' },
					{ name: '美文游记', path: '/studio/strategy/美文游记' },
				]
			},

			{
				name: '景区动态',
				icon: 'file-text',
				path: '/studio/news/:channel',
				component: './content',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT,
				routes: [
					{ name: '官方公告', path: '/studio/news/官方公告' },
					{ name: '精彩活动', path: '/studio/news/精彩活动' },
					{ name: '新闻动态', path: '/studio/news/新闻动态' }
				]
			},
			{
				name_noshow: '详情',
				path: '/studio/contentdetail/:channel/:id',
				component: './content/detail'
			},
			{
				name: '联系我们',
				icon: 'contacts',
				path: '/studio/about/:channel',
				component: './content',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT,
				routes: [
					{ name: '联系方式', path: '/studio/about/联系方式' },
					{ name: '留言咨询', path: '/studio/about/留言咨询' },
					{ name: '投诉建议', path: '/studio/about/投诉建议' }
				]
			},
			{
				name: '组织架构',
				icon: 'apartment',
				path: '/studio/organization',
				component: './organization',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT
			},
			{
				name: '用户管理',
				icon: 'team',
				path: '/studio/users/:channel',
				component: './users',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT,
				routes: [
					{ name: '管理员', path: '/studio/users/admin' },
					{ name: '客户', path: '/studio/users/customer' },
				]
			},
			{
				name_noshow: '详情',
				path: '/studio/usersdetail/:channel/:id',
				component: './users/detail'
			},
			{
				name: '权限管理',
				icon: 'cluster',
				path: '/studio/auth',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT,
				routes: [
					{ name: '角色', component: './auth/role', path: '/studio/auth/role' },
					{ name: '权限', component: './auth/authority', path: '/studio/auth/authority' },
				]
			},
			{
				name_noshow: '详情',
				path: '/studio/roledetail/:id',
				component: './auth/role/detail'
			},
			{
				name: '菜单管理',
				icon: 'menu',
				path: '/studio/category',
				component: './category',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT
			},
			{
				name: '站点设置',
				icon: 'setting',
				path: '/studio/setting',
				component: './setting',
				Routes: ['src/pages/Authorized'],
				authority: AUTHORITY.CONTENT
			},
			{
				name_noshow: '个人设置',
				path: '/studio/user/setting',
				component: './user/setting',
			}
			// {
			// 	name_noshow: '个人设置',
			// 	path: '/studio/user/settings',
			// 	component: './user/settings/Info',
			// 	routes: [
			// 		{
			// 			path: '/studio/user/settings',
			// 			redirect: '/studio/user/settings/base'
			// 		},
			// 		{
			// 			path: '/studio/user/settings/base',
			// 			component: './user/settings/BaseView'
			// 		},
			// 		{
			// 			path: '/studio/user/settings/password',
			// 			component: './user/settings/PasswordView'
			// 		},
			// 		{
			// 			path: '/studio/user/settings/security',
			// 			component: './user/settings/SecurityView'
			// 		},
			// 		{
			// 			path: '/studio/user/settings/binding',
			// 			component: './user/settings/BindingView'
			// 		},
			// 		{
			// 			path: '/studio/user/settings/notification',
			// 			component: './user/settings/NotificationView'
			// 		}
			// 	]
			// }
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
