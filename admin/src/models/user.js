import _ from 'lodash';
import { message } from 'antd';
import router from 'umi/router';
import config from '@/config';
import { apiGet, apiPost, apiPut } from '@/utils';

const API_LOGIN_URL = config.apiRoot + '/login';
const API_URL = config.apiRoot + '/user';
const API_CURRENT_USER_URL = config.apiRoot + '/user/current';
const API_CHANGE_PASSWORD_URL = config.apiRoot + '/user/password';

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

      router.replace({
        pathname: '/',
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

      if (referrer) {
        router.replace({
          pathname: referrer.pathname,
          query: referrer.query,
        });
      }
    },
    *changePassword({ payload }, { call, put }) {
      yield call(apiPut, API_CHANGE_PASSWORD_URL, payload);

      message.success('修改成功，请重新登录');
      yield put({
        type: 'logout'
      });
    },
    *save({ payload }, { call, put, select }) {
      const { currentUser } = yield select((state) => state.user);

      let res = null;

      if (_.isEmpty(currentUser)) {
        res = yield call(apiPost, API_URL, payload);
      } else {
        res = yield call(apiPut, API_URL, _.merge(currentUser, payload));
      }

      if (!!res) {
        yield put({
          type: 'set',
          payload: {
            currentUser: res,
          },
        });
        message.success('保存成功');
      }
    },
  },

  reducers: {
    set(state, { payload }) {
      return { ...state, ...payload };
    },
  }
};
