import { apiGet, apiPut } from '@/utils/index';
import config from '@/config';

export default {
  namespace: 'recharge',

  state: {
    conditions: {},
    data: {
      page: 0,
      pageSize: config.PAGE_SIZE,
      total: 0,
      totalPage: 0,
      list: [],
    },
  },

  effects: {
    *fetch({ payload }, { call, put, select }) {
      payload.page = !!payload.page ? payload.page - 1 : 0;

      const res = yield call(apiGet, '/recharge/list', { params: payload });

      if (!!res.data) {
        const { pageSize } = yield select(state => state.user.data);

        yield put({
          type: 'set',
          payload: {
            data: {
              page: payload.page + 1,
              list: res.data[0],
              total: res.data[1],
              pageSize: config.PAGE_SIZE,
              totalPage: Math.ceil(res.data[1] / pageSize),
            },
          },
        });
      }
    },

    *update({ payload }, { call, put }) {
      yield call(apiPut, `/recharge/${payload.row.id}`, payload.values);

      yield put({
        type: 'fetch',
        payload: {
          page: 0,
        },
      });
    },
    *change({ payload }, { put }) {
      yield put({
        type: 'set',
        payload,
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
    save(state, action) {
      return {
        ...state,
        list: action.payload,
      };
    },
    saveCurrentUser(state, action) {
      return {
        ...state,
        currentUser: action.payload || {},
      };
    },
    changeNotifyCount(state, action) {
      return {
        ...state,
        currentUser: {
          ...state.currentUser,
          notifyCount: action.payload.totalCount,
          unreadCount: action.payload.unreadCount,
        },
      };
    },
  },
};
