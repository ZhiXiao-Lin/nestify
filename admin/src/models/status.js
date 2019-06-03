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

			history.listen((location) => {
				if ('POP' === history.action) {

					const client = io(`${config.SOCKET_ROOT}/status`);

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
