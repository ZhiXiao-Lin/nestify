import _ from 'lodash';
import { message } from 'antd';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils';
import config from '@/config';

const API_URL = config.API_ROOT + '/organization';

export default {
  namespace: 'organization',

  state: {
    parentId: null,
    selectedNode: null,
    selectedRows: [],
    queryParams: {},
    data: [],
    showQueryCondition: false,
    columns: [],
    fields: [],
  },

  effects: {
    *fetch({ payload }, { call, put, select }) {
      payload.page = !!payload.page ? payload.page - 1 : 0;
      payload.pageSize = config.PAGE_SIZE;

      const { queryParams } = yield select((state) => state.organization);

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
            queryParams: params,
            data: res,
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

      payload.callback && payload.callback(res);
    },
    *save({ payload }, { call, put, select }) {
      const { selectedNode } = yield select((state) => state.organization);

      let res = null;

      if (_.isEmpty(selectedNode)) {
        res = yield call(apiPost, API_URL, payload);
      } else {
        res = yield call(apiPut, API_URL, _.merge(selectedNode, payload));
      }

      if (!!res) {
        yield put({
          type: 'fetch',
          payload: {},
        });
        message.success('保存成功');
      }
    },
    *create({ payload }, { call, put, select }) {
      const parentId = yield select((state) => state.organization.parentId);

      const res = yield call(apiPost, API_URL, {
        parentId,
        ...payload,
      });

      if (!!res) {
        yield put({
          type: 'fetch',
          payload: {},
        });
        message.success('保存成功');
      }
    },
    *remove({ payload }, { call, select, put }) {
      const selectedRows = yield select((state) => state.organization.selectedRows);

      yield call(apiDelete, API_URL, {
        params: {
          selectedRows: selectedRows.join(','),
        },
      });

      yield put({
        type: 'set',
        payload: {
          selectedNode: null,
        },
      });

      payload.callback && payload.callback();
    },
    *parent({ payload }, { call, put }) {
      yield call(apiPut, API_URL + '/parent', payload);

      yield put({
        type: 'fetch',
        payload: {},
      });
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

  subscriptions: {
    init({ dispatch, history }) {
      history.listen((location) => {
        if ('POP' === history.action) {
          dispatch({
            type: 'fetch',
            payload: {},
          });
        }
      });
    },
  },
};
