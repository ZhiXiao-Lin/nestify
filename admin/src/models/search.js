import { merge } from 'lodash';
import moment from 'moment';
import config from '@/config';
import { apiPost } from '@/utils';

const API_URL = config.API_ROOT + '/search';

const indexTypeMaps = {
  contents: {
    type: 'content',
    field: 'title',
  },
  uploads: {
    type: 'uploads',
    field: 'baseName',
  },
};

export default {
  namespace: 'search',

  state: {
    tabkey: 'contents',
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
      const { pageSize, tabkey } = yield select((state) => state.search);
      payload.pageSize = pageSize;

      const map = indexTypeMaps[tabkey];
      payload.index = tabkey;

      payload = merge(payload, map);

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
    *changeTabkey({ payload }, { put }) {
      yield put({ type: 'search', payload: {} });
      yield put({
        type: 'set',
        payload: {
          tabkey: payload.tabkey,
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
