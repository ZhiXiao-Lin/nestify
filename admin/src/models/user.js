import { message } from 'antd';
import router from 'umi/router';
import config from '@/config';
import { apiGet, apiPost } from '@/utils';

const API_LOGIN_URL = config.API_ROOT + '/login';
const API_CURRENT_USER_URL = config.API_ROOT + '/user/current';

export default {
	namespace: 'user',

	state: {
		currentUser: null
	},

	effects: {
		*login({ payload }, { call, put }) {
			const token = yield call(apiPost, API_LOGIN_URL, payload);

			if (!token) return false;

			localStorage.setItem('token', token);

			yield put({
				type: 'fetchCurrentUser'
			});
		},
		*logout(_, { call, put }) {
			localStorage.removeItem('token');

			yield put({
				type: 'set',
				payload: {
					currentUser: null
				}
			});

			router.replace('/user/login');
		},
		*fetchCurrentUser({ payload }, { call, put }) {
			const currentUser = yield call(apiGet, API_CURRENT_USER_URL);

			if (!currentUser) return false;

			yield put({
				type: 'set',
				payload: {
					currentUser
				}
			});

			router.replace('/');
		},
		*updateCurrentUser({ payload }, { call, put, select }) {
			const credential = yield select((state) => state.user.credential);
			payload.criteria = { obj: { id: credential.user.id } };
			const result = yield call(superFetch.put, URL_API_USERS, payload);

			console.log(result);
			// if (!!result && result.length > 0) {
			//   yield put({
			//     type: 'setCurrentUserInfo',
			//     payload: result[0],
			//   });
			// }
		},
		*changePassword({ payload }, { call, put }) {
			// console.log('*changePassword: ', payload);
			const result = yield call(superFetch.put, URL_API_USER_PASSWORD, payload);
			// console.log('result: ', result);
			if (result.length === 0) {
				message.error('密码更新失败！');
			} else {
				message.success('密码设置成功，请重新登陆！');
				yield put({
					type: 'logout'
				});
			}
		}
	},

	reducers: {
		set(state, { payload }) {
			return { ...state, ...payload };
		}
	},

	subscriptions: {
		initial({ dispatch }) {}
	}
};
