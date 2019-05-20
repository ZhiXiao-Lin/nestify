import superFetch from '../utils/apirequest';
import { treeInitial } from '@/utils/tree';
import config from '../utils/config';

const URL_API_ORGANIZATIONS = config.API_URL.ORGANIZATIONS;

export default {
	namespace: 'organizations',

	state: {
		treeRoot: {
			__path: '',
			__level: 0,
			children: []
		},
		orphans: [],
		selectedNode: null,

		records: [],
		recordId: null,
		criteria: null
	},

	effects: {
		*fetch({ payload }, { call, put }) {
			const criteria = payload;
			console.log(config.API_URL);
			const records = yield call(superFetch.get, URL_API_ORGANIZATIONS, criteria);
			yield put({
				type: 'set',
				payload: { records, criteria }
			});
		},
		*delete({ payload }, { call, put, select }) {
			const result = yield call(superFetch.delete, URL_API_ORGANIZATIONS, payload);
			if (!result) return;
			const criteria = yield select((state) => state.organizations.criteria);
			const records = yield call(superFetch.get, URL_API_ORGANIZATIONS, criteria);
			if (!records) return;
			yield put({
				type: 'set',
				payload: { records }
			});
		},
		*update({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, URL_API_ORGANIZATIONS, payload);
			if (!result) return;
			const criteria = yield select((state) => state.organizations.criteria);
			const records = yield call(superFetch.get, URL_API_ORGANIZATIONS, criteria);
			if (!records) return;
			yield put({
				type: 'set',
				payload: { records }
			});
		},
		*create({ payload }, { call, put }) {
			const newOrgs = yield call(superFetch.post, URL_API_ORGANIZATIONS, payload);
			if (!newOrgs || newOrgs instanceof Error || newOrgs.length === 0) {
				return;
			}
			yield put({ type: 'add', newOrgs });
		},
		*renamePath({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, `${URL_API_ORGANIZATIONS}/treepath`, payload);
			if (!result) return;

			const criteria = yield select((state) => state.organizations.criteria);
			const records = yield call(superFetch.get, URL_API_ORGANIZATIONS, criteria);
			if (!records) return;

			yield put({
				type: 'set',
				payload: { records }
			});
		},

		*removePath({ payload }, { call, put, select }) {
			const result = yield call(superFetch.delete, `${URL_API_ORGANIZATIONS}/treepath`, payload);
			if (!result) return;

			const criteria = yield select((state) => state.organizations.criteria);
			const records = yield call(superFetch.get, URL_API_ORGANIZATIONS, criteria);
			if (!records) return;

			yield put({
				type: 'set',
				payload: { records }
			});
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

			const { records } = payload;
			if (!!records) {
				treeInitial(records, 'tree_path', state.treeRoot, state.orphans);
			}
			return { ...state, ...payload };
		},
		add(state, { newOrgs }) {
			state.records = [ ...state.records, ...newOrgs ];
			state.recordId = newOrgs[0].id;
			treeInitial(state.records, 'tree_path', state.treeRoot, state.orphans);
			return { ...state };
		}
	}
};
