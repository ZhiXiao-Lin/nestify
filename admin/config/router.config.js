export default [
	// user
	{
		path: '/user',
		component: '../layouts/UserLayout',
		routes: [
			{ path: '/user', redirect: '/user/login' },
			{ path: '/user/login', name: 'login', component: './User/Login' },
			{ path: '/user/register', name: 'register', component: './User/Register' },
			{
				path: '/user/register-result',
				name: 'register.result',
				component: './User/RegisterResult'
			}
		]
	},
	// app
	{
		path: '/',
		component: '../layouts/BasicLayout',
		Routes: [ 'src/pages/Authorized' ],
		routes: [
			// dashboard
			{ path: '/', redirect: '/dashboard/analysis' },
			{
				path: '/dashboard',
				name: 'dashboard',
				icon: 'dashboard',
				routes: [
					{
						path: '/dashboard/analysis',
						name: 'analysis',
						component: './Dashboard/Analysis'
					}
				]
			},

			// contents
			{
				path: '/contents',
				name: 'contents',
				icon: 'file-text',
				routes: [
					{
						path: '/contents/slides',
						name: 'slides',
						component: './Contents/Slides'
					},
					{
						path: '/contents/notices',
						name: 'notices',
						component: './Contents/Notices'
					}
				]
			},

			{
				component: '404'
			}
		]
	}
];
