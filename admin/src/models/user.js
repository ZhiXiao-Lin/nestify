import { message } from 'antd';
import router from 'umi/router';
import config from '@/config';
import { apiGet, apiPost } from '@/utils';

const API_LOGIN_URL = config.API_ROOT + '/login';
const API_CURRENT_USER_URL = config.API_ROOT + '/user/current';

export default {
  namespace: 'user',

  state: {
    currentUser: null,
  },

  effects: {
    *login({ payload }, { call, put }) {
      const token = yield call(apiPost, API_LOGIN_URL, payload);

      if (!token) return false;

      localStorage.setItem('token', token);

      yield put({
        type: 'fetchCurrentUser',
      });
    },
    *logout(_, { call, put }) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('currentUser');

      yield put({
        type: 'set',
        payload: {
          currentUser: null,
        },
      });

      router.replace('/user/login');
    },
    *fetchCurrentUser({ payload }, { call, put, select }) {
      const currentUser = yield call(apiGet, API_CURRENT_USER_URL);

      if (!currentUser) return false;

      const { state } = yield select((state) => state.routing.location);

      const referrer = state ? state.referrer : null;

      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

      yield put({
        type: 'set',
        payload: {
          currentUser,
        },
      });

      if (!payload.authorized) {
        router.replace({
          pathname: referrer.pathname || '/',
          query: referrer.query || {},
        });
      }
    },
  },

  reducers: {
    set(state, { payload }) {
      return { ...state, ...payload };
    },
  },

  subscriptions: {
    initial({ dispatch }) {},
  },
};
