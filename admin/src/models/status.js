import io from 'socket.io-client';
import { notification } from 'antd';
import config from '@/config';


export default {
	namespace: 'status',

	state: {
		status: []
	},

	subscriptions: {
		onConnection({ dispatch, history }) {
			let client = null;
			history.listen((location) => {

				if ('/studio' === location.pathname) {

					client = io(`${config.SOCKET_ROOT}/status`);

					client.on('connect', (socket) => {
						console.log(`================ on ${client.id} connect`, client);

						client.on('status', (status) => {

							dispatch({
								type: 'set',
								payload: {
									status
								}
							});
						});
					});
				} else {
					!!client && client.close();
				}
			});

		}
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
