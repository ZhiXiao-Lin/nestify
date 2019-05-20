import superFetch from '@/utils/apirequest';
import { delay } from '@/utils/utils';
import config from '../utils/config';

const BACKEND_API_URL = config.API_URL.ORDERS;
const BACKEND_API_URL_TASKS = config.API_URL.ORDER_TASKS;
const BACKEND_API_URL_WORKFLOWS = config.API_URL.ORDER_WORKFLOWS;

export default {
	namespace: 'orders',

	state: {
		tasks: [],
		criteriaTasks: null,

		workflows: [],
		criteriaWorkflows: null,

		records: [],
		recordId: null,
		targetId: null,
		criteria: null
	},

	effects: {
		*fetchWorkflows({ payload }, { call, put }) {
			const criteriaWorkflows = payload;
			const workflows = yield call(superFetch.get, BACKEND_API_URL_WORKFLOWS, criteriaWorkflows);
			yield put({
				type: 'set',
				payload: { workflows, criteriaWorkflows }
			});
		},

		*fetchTasks({ payload }, { call, put }) {
			const criteriaTasks = payload;
			const tasks = yield call(superFetch.get, BACKEND_API_URL_TASKS, criteriaTasks);
			yield put({
				type: 'set',
				payload: { tasks, criteriaTasks }
			});
		},

		*updateTasks({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, BACKEND_API_URL_TASKS, payload);
			if (!result) return;

			yield call(delay, 2000);

			const criteriaTasks = yield select((state) => state.orders.criteriaTasks);
			const tasks = yield call(superFetch.get, BACKEND_API_URL_TASKS, criteriaTasks);
			if (!tasks) return;

			yield put({
				type: 'set',
				payload: { tasks }
			});
		},

		*fetch({ payload }, { call, put }) {
			const criteria = payload;
			const records = yield call(superFetch.get, BACKEND_API_URL, criteria);

			yield put({
				type: 'set',
				payload: { records, criteria }
			});
		},

		*update({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, BACKEND_API_URL, payload);
			if (!result) return;

			const criteria = yield select((state) => state.orders.criteria);
			const records = yield call(superFetch.get, BACKEND_API_URL, criteria);
			if (!records) return;

			yield put({
				type: 'set',
				payload: { records }
			});
		},

		*create({ payload }, { call, put }) {
			const newRecords = yield call(superFetch.post, BACKEND_API_URL, payload);
			if (!newRecords || newRecords instanceof Error || newRecords.length === 0) {
				return;
			}
			yield put({ type: 'add', newRecords });
		}
	},

	reducers: {
		set(state, { payload }) {
			if (!payload) return;
			return { ...state, ...payload };
		},
		add(state, { newRecords }) {
			state.records = [ ...state.records, ...newRecords ];
			state.recordId = newRecords[0].id;
			return { ...state };
		}
	}
};
