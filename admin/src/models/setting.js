import _ from 'lodash';
import moment from 'moment';
import { message } from 'antd';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils';
import { downloadBuffer } from '@/utils/utils';
import config from '@/config';

const API_URL = config.API_ROOT + '/setting';

export default {
  namespace: 'setting',

  state: {
    selectedNode: null,
  },

  effects: {
    *detail({ payload }, { call, put }) {
      const res = yield call(apiGet, API_URL);

      yield put({
        type: 'set',
        payload: {
          selectedNode: res,
        },
      });
    },
    *save({ payload }, { call, put, select }) {
      const { selectedNode } = yield select((state) => state.contents);

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
