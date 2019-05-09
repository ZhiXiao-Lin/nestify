import { query as queryUsers, queryCurrent } from '@/services/user';
import { apiGet, apiPost, apiPut } from '@/utils/index';
import config from '@/config';
import { message } from 'antd';

export default {
	namespace: 'mechanism',

	state: {
		conditions: {},
		data: {
			page: 0,
			pageSize: config.PAGE_SIZE,
			total: 0,
			totalPage: 0,
			list: []
		},
		user: {}
	},

	effects: {
		*fetch({ payload }, { call, put, select }) {
			payload.page = !!payload.page ? payload.page - 1 : 0;

			const res = yield call(apiGet, '/mechanism/list', { params: payload });

			if (!!res.data) {
				const { pageSize } = yield select((state) => state.mechanism.data);

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
			const user = yield select((state) => state.mechanism.user);

			if (!user.key) {
				message.error('请先设置机构管理员！');
				return false;
			}
			payload.values.users = [ user.key ];

			yield call(apiPost, `/mechanism`, payload.values);

			yield put({
				type: 'fetch',
				payload: {
					page: 0
				}
			});
		},
		*update({ payload }, { call, put }) {
			yield call(apiPut, `/mechanism/${payload.mechanism.id}`, payload.values);

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
