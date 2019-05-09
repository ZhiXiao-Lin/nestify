import { stringify } from 'qs';
import request from '@/utils/request';

const API_URL = '/api/rule';

export default {
	namespace: 'rule',

	state: {
		list: []
	},

	effects: {
		*fetch({ payload }, { call, put }) {
			console.log(111);
			const response = yield call(request, `${API_URL}?${stringify(payload)}`);
			console.log(response);
			yield put({
				type: 'save',
				payload: {
					list: Array.isArray(response) ? response : []
				}
			});
		},
		*appendFetch({ payload }, { call, put }) {
			const response = yield call(queryFakeList, payload);
			yield put({
				type: 'appendList',
				payload: Array.isArray(response) ? response : []
			});
		},
		*submit({ payload }, { call, put }) {
			let callback;
			if (payload.id) {
				callback = Object.keys(payload).length === 1 ? removeFakeList : updateFakeList;
			} else {
				callback = addFakeList;
			}
			const response = yield call(callback, payload); // post
			yield put({
				type: 'queryList',
				payload: response
			});
		}
	},

	reducers: {
		save(state, action) {
			return {
				...state,
				data: action.payload
			};
		},
		appendList(state, action) {
			return {
				...state,
				list: state.list.concat(action.payload)
			};
		}
	}
};
