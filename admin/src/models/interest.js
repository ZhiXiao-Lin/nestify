import { query as queryUsers, queryCurrent } from '@/services/user';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/index';
import config from '@/config';

export default {
	namespace: 'interest',

	state: {
		conditions: {},
		data: {
			page: 0,
			pageSize: config.PAGE_SIZE,
			total: 0,
			totalPage: 0,
			list: []
		}
	},

	effects: {
		*fetch({ payload }, { call, put, select }) {
			payload.page = !!payload.page ? payload.page - 1 : 0;

			const res = yield call(apiGet, '/recommendaccount/financing', { params: payload });

			if (!!res.data) {
				const { pageSize } = yield select((state) => state.interest.data);

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
		*create({ payload }, { call, put }) {
			yield call(apiPost, `/interest`, payload.values);

			yield put({
				type: 'fetch',
				payload: {
					page: 0
				}
			});
		},
		*update({ payload }, { call, put }) {
			yield call(apiPut, `/interest/${payload.interest.id}`, payload.values);

			yield put({
				type: 'fetch',
				payload: {
					page: 0
				}
			});
		},
		*remove({ payload }, { call, put }) {
			yield call(apiDelete, `/interest/${payload.id}`);

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
