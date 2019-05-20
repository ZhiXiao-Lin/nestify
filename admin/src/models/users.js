import superFetch from '../utils/apirequest';
import config from '../utils/config';

const BACKEND_API_URL = config.API_URL.USERS;
const URL_API_USERCREDENTIALS  = config.API_URL.USER_CREDENTIALS;

export default {
  namespace: 'users',

  state: {
    records: [],
    recordId: null,
    criteria: null
  },

  effects: {

    *fetch({ payload }, { call, put }) {
      const criteria = payload;
      const records = yield call(superFetch.get, BACKEND_API_URL, criteria);
      yield put({
        type: 'set',
        payload: { records, criteria }
      });
    },

    *delete({ payload }, { call, put, select }) {
      const result = yield call(superFetch.delete, BACKEND_API_URL, payload);
      if (!result) return;

      const criteria = yield select(state => state.users.criteria);
      const records = yield call(superFetch.get, BACKEND_API_URL, criteria);
      if (!records) return;

      yield put({ 
        type: 'set', 
        payload: { records },
      });
    },

    *update({ payload }, { call, put, select }) {
      const result = yield call(superFetch.put, BACKEND_API_URL, payload);
      if (!result) return;

      const criteria = yield select(state => state.users.criteria);
      const records = yield call(superFetch.get, BACKEND_API_URL, criteria);
      if (!records) return;

      yield put({ 
        type: 'set', 
        payload: { records },
      });
    },

    *updateCredentials({ payload }, { call, put, select }) {
      const result = yield call(superFetch.put, URL_API_USERCREDENTIALS, payload);
      if (!result) return;

      const criteria = yield select(state => state.users.criteria);
      const records = yield call(superFetch.get, BACKEND_API_URL, criteria);
      if (!records) return;

      yield put({ 
        type: 'set', 
        payload: { records },
      });
    },

    *create({ payload }, { call, put }) {
      const newUsers = yield call(superFetch.post, BACKEND_API_URL, payload);
      if (!newUsers || newUsers instanceof Error || (newUsers.length ===0) ) {
        return;
      }
      yield put({ type: 'add', newUsers });
    },
  },

  reducers: {
    set(state, { payload }) {
      return Object.assign(state, payload);
    },
    add(state, { newUsers }) {
      return {
        records: [...state.records, ...newUsers],
        recordId: newUsers[0].user_id
      };
    },
  },

};
