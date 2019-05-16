import setting from '../defaultSettings';

export default {
	namespace: 'global',

	state: {
		loading: false,
		collapsed: false,
		settings: {},
		menuLayout: setting.layout
	},

	effects: {
		*set(action, { put }) {
			console.log('effects:*set: ', action);
			// yield put({
			//   type: 'set',
			//   payload: action.payload,
			// });
		}
	},

	reducers: {
		changeLayoutCollapsed(state, { payload }) {
			return {
				...state,
				collapsed: payload
			};
		},
		set(state, action) {
			console.log('reducers:setSettings: ', action);
			return {
				...state,
				...action.payload
			};
		},
		setSettings(state, action) {
			console.log('reducers:setSettings: ', action);
			console.log(state);
			return {
				...state,
				...action.payload
			};
		},
		setMenuLayout(state, action) {
			console.log('reducers:setMenuLayout: ', action);
			return {
				...state,
				...action.payload
			};
		}
	}
};
