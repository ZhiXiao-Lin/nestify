import superFetch from '@/utils/apirequest';
import { treeInitial } from '@/utils/tree';
import config from '../utils/config';

const BACKEND_API_URL = config.API_URL.PROJECTS;

export default {
	namespace: 'projects',

	state: {
		treeRoot: {
			__path: '',
			__level: 0,
			children: []
		},
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

		*update({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, BACKEND_API_URL, payload);
			if (!result) return;

			const criteria = yield select((state) => state.projects.criteria);
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
		setRoot(state, { payload }) {
			if (!payload || !payload.rootPath) return state;

			state.treeRoot.__path = payload.rootPath;
			state.treeRoot.__level = state.treeRoot.__path.split('.').length;

			const { maindata } = state;
			if (!!maindata) {
				treeInitial(maindata, 'tree_path', state.treeRoot, state.orphans);
			}
			return { ...state };
		},
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
