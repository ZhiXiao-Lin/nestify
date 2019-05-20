import superFetch from '../utils/apirequest';
import config from '../utils/config';

const BACKEND_API_URL = config.API_URL.TRANSACTIONS;
const BACKEND_WEPAY_REFUND = config.API_URL.WEPAY.REFUND;

export default {
  namespace: 'transactions',

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

      const criteria = yield select(state => state.transactions.criteria);
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

      const criteria = yield select(state => state.transactions.criteria);
      const records = yield call(superFetch.get, BACKEND_API_URL, criteria);
      if (!records) return;

      yield put({ 
        type: 'set', 
        payload: { records },
      });
    },

    *create({ payload }, { call, put }) {
      const newRecords = yield call(superFetch.post, BACKEND_API_URL, payload);
      if (!newRecords || newRecords instanceof Error || (newRecords.length ===0) ) {
        return;
      }
      yield put({ type: 'add', newRecords });
    },

    *refund({ payload }, { call, put }) {
      const newRecords = yield call(superFetch.post, BACKEND_WEPAY_REFUND, payload);
      if (!newRecords || newRecords instanceof Error || (newRecords.length ===0) ) {
        return;
      }
      yield put({ type: 'add', newRecords });
    },
    
  },

  reducers: {
    set(state, { payload }) {
      return Object.assign(state, payload);
    },
    add(state, { newRecords }) {
      return {
        records: [...state.records, ...newRecords],
        recordId: newRecords[0].id
      };
    },
  },

};
