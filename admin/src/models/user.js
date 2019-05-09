import { query as queryUsers, queryCurrent } from '@/services/user';
import { apiGet, apiPut } from '@/utils/index';
import config from '@/config';

export default {
	namespace: 'user',

	state: {
		conditions: {},
		data: {
			page: 0,
			pageSize: config.PAGE_SIZE,
			total: 0,
			totalPage: 0,
			list: []
		},
		currentUser: {},
		searchs: []
	},

	effects: {
		*search({ payload }, { call, put }) {
			const res = yield call(apiGet, '/user/list', { params: { q: payload, page: 0 } });
			if (!!res.data) {
				yield put({
					type: 'set',
					payload: {
						searchs: res.data[0]
					}
				});
			}
		},
		*fetch({ payload }, { call, put, select }) {
			payload.page = !!payload.page ? payload.page - 1 : 0;

			const res = yield call(apiGet, '/user/list', { params: payload });

			if (!!res.data) {
				const { pageSize } = yield select((state) => state.user.data);

				yield put({
					type: 'set',
					payload: {
						data: {
							page: payload.page + 1,
							list: res.data[0],
							total: res.data[1],
							pageSize: config.PAGE_SIZE,
							totalPage: Math.ceil(res.data[1] / pageSize)
						}
					}
				});
			}
		},
		*fetchCurrent(_, { call, put }) {
			const res = yield call(apiGet, '/user/current');

			yield put({
				type: 'set',
				payload: {
					currentUser: res.data
				}
			});
		},
		*update({ payload }, { call, put }) {
			yield call(apiPut, `/user/${payload.user.id}`, payload.values);

			yield put({
				type: 'fetch',
				payload: {
					page: 0
				}
			});
		},
		*roles({ payload }, { call, put }) {
			yield call(apiPut, `/user/roles/${payload.user.id}`, payload.values);

			yield put({
				type: 'fetch',
				payload: {
					page: 0
				}
			});
		},
		*change({ payload }, { put }) {
			yield put({
				type: 'set',
				payload
			});
		}
	},

	reducers: {
		set(state, { payload }) {
			return {
				...state,
				...payload
			};
		}
	}
};
