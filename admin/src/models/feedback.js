import _ from 'lodash';
import moment from 'moment';
import { message } from 'antd';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils';
import { ExcelHelper } from '@/utils/excel';
import config from '@/config';

const API_URL = config.apiRoot + '/feedback';

export default {
  namespace: 'feedback',

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
      list: [],
    },
    showQueryCondition: false,
    columns: [],
    fields: [],
  },

  effects: {
    *fetch({ payload }, { call, put, select }) {
      payload.page = !!payload.page ? payload.page - 1 : 0;
      payload.pageSize = config.pagination.size;

      const { queryParams } = yield select((state) => state.feedback);

      const params = _.merge(queryParams, payload);

      yield put({
        type: 'set',
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
              totalPage: Math.ceil(res[1] / config.pagination.size),
            },
          },
        });
      }
    },
    *detail({ payload }, { call, put }) {
      const res = yield call(apiGet, API_URL + '/' + payload.id);

      yield put({
        type: 'set',
        payload: {
          selectedNode: res,
        },
      });
    },
    *save({ payload }, { call, put, select }) {
      const { selectedNode } = yield select((state) => state.feedback);

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
            selectedNode: res,
          },
        });
        message.success('保存成功');
      }
    },
    *remove({ payload }, { call, select }) {
      const selectedRows = yield select((state) => state.feedback.selectedRows);

      yield call(apiDelete, API_URL, {
        params: {
          selectedRows: selectedRows.map((item) => item.id).join(','),
        },
      });

      payload.callback && payload.callback();
    },
    *delete({ payload }, { call }) {
      yield call(apiDelete, API_URL, {
        params: {
          selectedRows: payload.id,
        },
      });

      payload.callback && payload.callback();
    },
    *export({ payload }, { call, select }) {
      message.loading('正在执行导出', 0);

      const { queryParams, columns, fields } = yield select((state) => state.feedback);

      const res = yield call(apiGet, API_URL + '/export', {
        params: {
          isExport: true,
          ...payload,
          ...queryParams,
        },
      });

      yield call(
        ExcelHelper.export,
        queryParams.category + '-' + moment().format('YYYY-MM-DD-HH-mm-ss'),
        res,
        columns,
        fields
      );

      message.destroy();
      message.success('导出成功');
    },
  },

  reducers: {
    set(state, { payload }) {
      return {
        ...state,
        ...payload,
      };
    },
  },
};
