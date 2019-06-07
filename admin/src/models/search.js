import moment from 'moment';
import config from '@/config';
import { apiPost } from '@/utils';

const API_URL = config.API_ROOT + '/search';

export default {
  namespace: 'search',

  state: {
    keyword: '',
    consuming: 0,
    page: 1,
    pageSize: 8,
    data: {
      hits: [],
      total: 0,
    },
  },

  effects: {
    *search({ payload }, { call, put, select }) {
      payload.field = payload.field || 'title';
      payload.pageSize = yield select((state) => state.search.pageSize);

      const searchStart = moment().valueOf();

      const res = yield call(apiPost, API_URL, payload);

      const searchEnd = moment().valueOf();

      yield put({
        type: 'set',
        payload: {
          keyword: payload.keyword,
          page: payload.page,
          consuming: searchEnd - searchStart,
          data: res ? res.hits : { hits: [], total: 0 },
        },
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
};
