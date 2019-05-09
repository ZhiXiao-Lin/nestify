import { query as queryUsers, queryCurrent } from '@/services/user';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/index';
import config from '@/config';

export default {
	namespace: 'multiple',

	state: {
		conditions: {},
		data: {
			page: 0,
			pageSize: config.PAGE_SIZE,
			total: 0,
			totalPage: 0,
			list: []
		},
		mechanism: {}
	},

	effects: {
		*fetch({ payload }, { call, put, select }) {
			payload.page = !!payload.page ? payload.page - 1 : 0;

			const res = yield call(apiGet, '/multiple/list', { params: payload });

			if (!!res.data) {
				const { pageSize } = yield select((state) => state.multiple.data);

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
		*create({ payload }, { call, put, select }) {
			const mechanism = yield select((state) => state.multiple.mechanism);

			if (!mechanism.key) {
				message.error('请先选择机构！');
				return false;
			}
			payload.values.mechanism = mechanism.key;

			yield call(apiPost, `/multiple`, payload.values);

			yield put({
				type: 'fetch',
				payload: {
					page: 0
				}
			});
		},
		*update({ payload }, { call, put }) {
			yield call(apiPut, `/multiple/${payload.multiple.id}`, payload.values);

			yield put({
				type: 'fetch',
				payload: {
					page: 0
				}
			});
		},
		*remove({ payload }, { call, put }) {
			yield call(apiDelete, '/multiple', { params: payload });

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
