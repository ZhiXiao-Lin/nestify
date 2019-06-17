import _ from 'lodash';
import moment from 'moment';
import { message } from 'antd';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils';
import { downloadBuffer } from '@/utils/utils';
import config from '@/config';

const API_URL = config.apiRoot + '/user';

export default {
	namespace: 'users',

	state: {
		selectedNode: null,
		selectedRows: [],
		selectedRowKeys: [],
		queryParams: {},
		data: {
			page: 0,
			pageSize: config.pagination.size,
			total: 0,
			totalPage: 0,
			list: []
		},
		showQueryCondition: false,
		columns: [],
		fields: []
	},

	effects: {
		*fetch({ payload }, { call, put, select }) {
			payload.page = !!payload.page ? payload.page - 1 : 0;
			payload.pageSize = config.pagination.size;

			const { queryParams } = yield select((state) => state.users);

			const params = _.merge(queryParams, payload);

			yield put({
				type: 'set'
			});

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
							pageSize: config.pagination.size,
							list: res[0],
							total: res[1],
							totalPage: Math.ceil(res[1] / config.pagination.size)
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
			const { selectedNode } = yield select((state) => state.users);

			let res = null;

			if (_.isEmpty(selectedNode)) {
				res = yield call(apiPost, API_URL, payload);
			} else {
				res = yield call(apiPut, API_URL, _.merge(selectedNode, payload));
			}

			if (!!res) {
				yield put({
					type: 'detail',
					payload: {
						id: res.id
					}
				});
				message.success('保存成功');
			}
		},
		*remove({ payload }, { call, select }) {
			const selectedRows = yield select((state) => state.users.selectedRows);

			const rows = [];
			const superAdmin = [];

			selectedRows.forEach(row => {
				if (!row.isSuperAdmin) {
					rows.push(row);
				} else {
					superAdmin.push(row);
				}
			});

			if (superAdmin.length > 0) {
				message.warning('超级管理员不能删除');
			}

			if (rows.length <= 0) return false;

			yield call(apiDelete, API_URL, {
				params: {
					selectedRows: rows.map((item) => item.id).join(',')
				}
			});

			payload.callback && payload.callback();
		},
		*export({ payload }, { call, select }) {
			message.loading('正在执行导出', 0);

			const queryParams = yield select((state) => state.users.queryParams);

			const fileBuffer = yield call(apiGet, API_URL + '/export', {
				responseType: 'arraybuffer',
				params: {
					isExport: true,
					...payload,
					...queryParams
				}
			});

			downloadBuffer(fileBuffer, queryParams.category + '-' + moment().format('YYYY-MM-DD-HH-mm-ss'));

			message.destroy();
			message.success('导出成功');
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
