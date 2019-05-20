import superFetch from '../utils/apirequest';
import { message } from 'antd';
import config from '../utils/config';

const BACKEND_API_URL = config.API_URL.DBOPS;

export default {
  namespace: 'dbops',

  state: {
    records: [],
  },

  effects: {
    *fetch({ payload }, { call, put }) {
      const criteria = payload;
      const records = yield call(superFetch.get, BACKEND_API_URL, criteria);
      yield put({
        type: 'set',
        payload: { records }
      });
    },
  },

  reducers: {
    set(state, { payload }) {
      return Object.assign(state, payload);
    },
  },

};
