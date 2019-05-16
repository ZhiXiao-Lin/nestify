import superFetch from '@/utils/apirequest';
import { treeInitial } from '@/utils/tree';
import config from '../utils/config';

const URL_API_CONTENTS = config.API_URL.CONTENTS;

export default {
	namespace: 'contents',

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
			const records = yield call(superFetch.get, URL_API_CONTENTS, criteria);

			yield put({
				type: 'set',
				payload: { records, criteria }
			});
		},

		*update({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, URL_API_CONTENTS, payload);
			if (!result) return;

			const criteria = yield select((state) => state.contents.criteria);
			const records = yield call(superFetch.get, URL_API_CONTENTS, criteria);
			if (!records) return;

			yield put({
				type: 'set',
				payload: { records }
			});
		},

		*create({ payload }, { call, put }) {
			const newContents = yield call(superFetch.post, URL_API_CONTENTS, payload);
			// console.log({payload, newContents});
			if (!newContents || newContents instanceof Error || newContents.length === 0) {
				return;
			}
			yield put({ type: 'add', newContents });
		},

		*renamePath({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, `${URL_API_CONTENTS}/treepath`, payload);
			if (!result) return;

			const criteria = yield select((state) => state.contents.criteria);
			const records = yield call(superFetch.get, URL_API_CONTENTS, criteria);
			if (!records) return;

			yield put({
				type: 'set',
				payload: { records }
			});
		},

		*removePath({ payload }, { call, put, select }) {
			const result = yield call(superFetch.delete, `${URL_API_CONTENTS}/treepath`, payload);
			if (!result) return;

			const criteria = yield select((state) => state.contents.criteria);
			const records = yield call(superFetch.get, URL_API_CONTENTS, criteria);
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
		add(state, { newContents }) {
			state.records = [ ...state.records, ...newContents ];
			state.recordId = newContents[0].id;
			treeInitial(state.records, 'tree_path', state.treeRoot, state.orphans);
			return { ...state };
		}
	}
};
