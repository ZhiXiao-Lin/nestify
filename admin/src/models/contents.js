import _ from 'lodash';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils';
import config from '@/config';
import { message } from 'antd';

const API_URL = config.API_ROOT + '/content';

export default {
	namespace: 'contents',

	state: {
		selectedNode: null,
		selectedRows: [],
		selectedRowKeys: [],
		queryParams: {},
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
			payload.pageSize = config.PAGE_SIZE;

			const { queryParams } = yield select((state) => state.contents);

			const params = _.merge(queryParams, payload);

			yield put({
				type: 'set'
			});

			console.log(params);

			const res = yield call(apiGet, API_URL + '/list', { params });

			if (!!res) {
				yield put({
					type: 'set',
					payload: {
						selectedRows: [],
						selectedRowKeys: [],
						queryParams: params,
						data: {
							page: params.page + 1,
							pageSize: config.PAGE_SIZE,
							list: res[0],
							total: res[1],
							totalPage: Math.ceil(res[1] / config.PAGE_SIZE)
						}
					}
				});
			}
		},
		*detail({ payload }, { call, put }) {
			const res = yield call(apiGet, API_URL + '/' + payload.id);

			yield put({
				type: 'set',
				payload: {
					selectedNode: res
				}
			});
		},
		*save({ payload }, { call, put, select }) {
			const { selectedNode } = yield select((state) => state.contents);

			let res = null;

			if (_.isEmpty(selectedNode)) {
				res = yield call(apiPost, API_URL, payload);
			} else {
				res = yield call(apiPut, API_URL, _.merge(selectedNode, payload));
			}

			if (!!res) {
				yield put({
					type: 'set',
					payload: {
						selectedNode: res
					}
				});
				message.success('修改成功');
			}
		},
		*remove({ payload }, { call, select }) {
			const selectedRows = yield select((state) => state.contents.selectedRows);

			yield call(apiDelete, API_URL, {
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
