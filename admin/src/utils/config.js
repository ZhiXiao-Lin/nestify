const config = {
	NODE_ENV: 'development',
	URL_ROOT: 'http://127.0.0.1:3000',
	API_ROOT: 'http://127.0.0.1:3000/api',
	SOCKET_ROOT: 'http://127.0.0.1:9000',
	SOCKET_OPTIONS: {},
	BUILD_DATE: '2019-04-21 18:00:00',
	PAGE_TITLE: '通用演示平台',
	APP_NAME: 'SYS_APP_DESKTOP_ADMIN',

	COPY_RIGHT: '',

	DB: {
		AUTH: {
			BIT_SIZE: 16
		}
	},

	USER: {
		DEFAULT_AVATAR_URL: 'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png'
	},

	API_URL: {
		LOGIN: '/login',
		LOGOUT: '/logout',
		REGISTER: '/register',
		FORGOT: '/forgot',
		TEST: '/test',
		DBOPS: '/dbops',
		AUTHORITIES: '/authorities',
		FUNCTIONS: '/functions',
		ROLES: '/roles',
		MAINDATA: '/maindata',
		CONTENTS: '/contents',
		USERS: '/users',
		USER_CREDENTIALS: 'usercredentials',
		ORGANIZATIONS: '/organizations',
		PROJECTS: '/projects',
		PRODUCTS: '/products',
		STOCKS: '/stocks',
		ORDERS: '/orders',
		ORDER_TASKS: '/ordertasks',
		ORDER_WORKFLOWS: '/orderworkflows',
		BILLS: '/bills',
		TRANSACTIONS: '/transactions',
		APPLICATIONS: '/applications',
		APPLICATION_TASKS: '/applicationtasks',
		VERIFICATION: {
			SMS: {
				USER_REGISTER: '/verification/sms/register',
				PASSWORD_RESET: '/verification/sms'
			},
			SVG: '/verification/svg'
		},
		WEPAY: {
			REFUND: '/wepay/refund'
		},
		UPLOAD: {
			BACKEND_STORAGE: '/storage/localhost'
		}
	},

	LOCAL_URL: {
		ROOT: '/',
		LOGIN: '/user/login',
		USER_SETTING: '/studio/user/settings/base',
		USER_DETAILS: '/studio/userdetails',
		ORG_DETAILS: '/studio/organizationdetails',
		CONTENT_DETAILS: '/studio/contentdetails',
		PROJECT_DETAILS: '/studio/projectdetails',
		SPU_DETAILS: '/studio/spudetails',
		SKU_DETAILS: '/studio/skudetails',
		INVENTORY_DETAILS: '/studio/inventorydetails',
		INVENTORY_NEW: '/studio/inventorynew',
		APPLICATION_DETAILS: '/studio/applicationdetails',
		ORDER_DETAILS: '/studio/orderdetails',
		BILL_DETAILS: '/studio/billdetails'
		// USER_CENTER   : '/studio/user/center',
	},

	PERSISTANCE: {
		USER: {
			KEY: 'user'
		}
	},

	LOGIN_LINKS: [
		{
			key: 'help',
			title: '帮助',
			href: ''
		},
		{
			key: 'privacy',
			title: '隐私',
			href: ''
		},
		{
			key: 'terms',
			title: '条款',
			href: ''
		}
	],

	FOOTER_LINKS: [
		{
			key: 'Pro 首页',
			title: 'Pro 首页',
			href: 'https://pro.ant.design',
			blankTarget: true
		},
		{
			key: 'github',
			title: { icon: 'github' },
			href: 'https://github.com/ant-design/ant-design-pro',
			blankTarget: true
		},
		{
			key: 'Ant Design',
			title: 'Ant Design',
			href: 'https://ant.design',
			blankTarget: true
		}
	],
	AMAP: {
		KEY: '6d03400761065ced940e1a7ef444a7b8'
	}
};

export default config;
