import { routerRedux } from 'dva/router';
import Router from 'umi/router';
import { message } from 'antd';
import { stringify } from 'qs';
import { fakeAccountLogin, getFakeCaptcha } from '@/services/api';
import { setAuthority } from '@/utils/authority';
import { getPageQuery } from '@/utils/utils';
import { reloadAuthorized } from '@/utils/Authorized';
import { apiPost } from '@/utils/index';

export default {
	namespace: 'login',

	state: {
		status: undefined
	},

	effects: {
		*login({ payload }, { call, put }) {
			const token = yield call(apiPost, '/login', payload);

			if (!!token.data) {
				message.success('登录成功');

				localStorage.setItem('token', token.data);

				Router.replace('/');
			}
		},

		*loginBak({ payload }, { call, put }) {
			const response = yield call(fakeAccountLogin, payload);
			yield put({
				type: 'changeLoginStatus',
				payload: response
			});
			// Login successfully
			if (response.status === 'ok') {
				reloadAuthorized();
				const urlParams = new URL(window.location.href);
				const params = getPageQuery();
				let { redirect } = params;
				if (redirect) {
					const redirectUrlParams = new URL(redirect);
					if (redirectUrlParams.origin === urlParams.origin) {
						redirect = redirect.substr(urlParams.origin.length);
						if (redirect.match(/^\/.*#/)) {
							redirect = redirect.substr(redirect.indexOf('#') + 1);
						}
					} else {
						window.location.href = redirect;
						return;
					}
				}
				yield put(routerRedux.replace(redirect || '/'));
			}
		},

		*getCaptcha({ payload }, { call }) {
			yield call(getFakeCaptcha, payload);
		},

		*logout(_, { put }) {
			yield put({
				type: 'changeLoginStatus',
				payload: {
					status: false,
					currentAuthority: 'guest'
				}
			});
			reloadAuthorized();
			yield put(
				routerRedux.replace({
					pathname: '/user/login',
					search: stringify({
						redirect: window.location.href
					})
				})
			);
		}
	},

	reducers: {
		changeLoginStatus(state, { payload }) {
			setAuthority(payload.currentAuthority);
			return {
				...state,
				status: payload.status,
				type: payload.type
			};
		}
	}
};
