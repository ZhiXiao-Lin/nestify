import { apiGet, apiDelete } from '@/utils';
import config from '@/config';

const API_CONTENT_URL = config.API_ROOT + '/content';

export default {
	namespace: 'contents',

	state: {
		selectedRows: [],
		selectedRowKeys: [],
		data: {
			page: 0,
			pageSize: config.PAGE_SIZE,
			total: 0,
			totalPage: 0,
			list: []
		}
	},

	effects: {
		*fetch({ payload }, { call, put }) {
			payload.page = !!payload.page ? payload.page - 1 : 0;
			payload.pageSize = config.PAGE_SIZE;

			const res = yield call(apiGet, API_CONTENT_URL + '/list', { params: payload });

			if (!!res) {
				yield put({
					type: 'set',
					payload: {
						selectedRows: [],
						selectedRowKeys: [],
						data: {
							page: payload.page + 1,
							pageSize: config.PAGE_SIZE,
							list: res[0],
							total: res[1],
							totalPage: Math.ceil(res[1] / config.PAGE_SIZE)
						}
					}
				});
			}
		},
		*remove({ payload }, { call, select }) {
			const selectedRows = yield select((state) => state.contents.selectedRows);

			yield call(apiDelete, API_CONTENT_URL, {
				params: {
					selectedRows: selectedRows.map((item) => item.id).join(',')
				}
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
