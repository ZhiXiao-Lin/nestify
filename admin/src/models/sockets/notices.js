import io from 'socket.io-client';
import config from '@/config';

export default {
  namespace: 'notices',

  state: {
    notices: [],
  },

  effects: {},

  subscriptions: {
    onConnection({ dispatch, history }) {
      let client = null;

      if (!client) {
        client = io(`${config.socketRoot}/notices`);

        client.on('connect', (socket) => {
          console.log(`================ notices on ${client.id} connect`, client);

          client.on('data', (notices) => {
            dispatch({
              type: 'set',
              payload: {
                notices,
              },
            });
          });
        });
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
