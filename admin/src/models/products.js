import superFetch from '@/utils/apirequest';
import { treeInitial } from '@/utils/tree';
import config from '../utils/config';

const BACKEND_API_URL = config.API_URL.PRODUCTS;
const BACKEND_API_SPU = `${BACKEND_API_URL}/spu`;
const BACKEND_API_SKU = `${BACKEND_API_URL}/sku`;

export default {
	namespace: 'products',

	state: {
		spu: [],
		spuId: null,
		criteriaSPU: null,

		sku: [],
		skuId: null,
		criteriaSKU: null,

		skuDetailsTab: 'basic',
	},

	effects: {
		*fetchSPUById({ payload }, { call, put, select }) {
			if (!payload || !payload.id) { return; }
			const spu = yield call(superFetch.get, BACKEND_API_SPU, payload);
			if (!spu) { return; }

			const spus = yield select((state) => state.products.spu);
			const exspus = spus.filter(item => item.id !== spu[0].id);

			// console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', spus, exspus, spu);

			yield put({
				type: 'set',
				payload: { 
					spu: [ ...exspus, ...spu ], 
					spuId: spu[0].id
				}
			});
		},
		*fetchSPU({ payload }, { call, put }) {
			const criteriaSPU = payload;
			const spu = yield call(superFetch.get, BACKEND_API_SPU, criteriaSPU);

			yield put({
				type: 'set',
				payload: { spu, criteriaSPU }
			});
		},

		*updateSPU({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, BACKEND_API_SPU, payload);
			if (!result) return;

			const criteriaSPU = yield select((state) => state.products.criteriaSPU);
			const spu = yield call(superFetch.get, BACKEND_API_SPU, criteriaSPU);
			if (!spu) return;

			yield put({
				type: 'set',
				payload: { spu }
			});
		},

		*createSPU({ payload }, { call, put }) {
			const newRecords = yield call(superFetch.post, BACKEND_API_SPU, payload);
			if (!newRecords || newRecords instanceof Error || newRecords.length === 0) {
				return;
			}
			yield put({ type: 'addSPU', newRecords });
		},

		*deleteSPU({ payload }, { call, put, select }) {
			const result = yield call(superFetch.delete, BACKEND_API_SPU, payload);
			if (!result) return;
			const criteriaSPU = yield select((state) => state.products.criteriaSPU);
			const spu = yield call(superFetch.get, BACKEND_API_SPU, criteriaSPU);
			if (!spu) return;
			yield put({
				type: 'set',
				payload: { spu }
			});
		},

		*fetchSKU({ payload }, { call, put, select }) {
			const criteriaSKU = payload;
			const sku = yield call(superFetch.get, BACKEND_API_SKU, criteriaSKU);

			yield put({
				type: 'set',
				payload: { sku, criteriaSKU }
			});
		},

		*updateSKU({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, BACKEND_API_SKU, payload);
			if (!result) return;

			const criteriaSKU = yield select((state) => state.products.criteriaSKU);
			const sku = yield call(superFetch.get, BACKEND_API_SKU, criteriaSKU);
			if (!sku) return;

			yield put({
				type: 'set',
				payload: { sku }
			});
		},

		*createSKU({ payload }, { call, put }) {
			const newRecords = yield call(superFetch.post, BACKEND_API_SKU, payload);
			if (!newRecords || newRecords instanceof Error || newRecords.length === 0) {
				return;
			}
			yield put({ type: 'addSKU', newRecords });
		},

		*deleteSKU({ payload }, { call, put, select }) {
			const result = yield call(superFetch.delete, BACKEND_API_SKU, payload);
			if (!result) return;
			const criteriaSKU = yield select((state) => state.products.criteriaSKU);
			console.log('deleteSKU reload: ', {criteriaSKU});
			const sku = yield call(superFetch.get, BACKEND_API_SKU, criteriaSKU);
			if (!sku) return;
			yield put({
				type: 'set',
				payload: { sku }
			});
		}
	},

	reducers: {
		set(state, { payload }) {
			if (!payload) return;
			return { ...state, ...payload };
		},
		// addSPU(state, { newRecords }) {
		// 	state.spu = [ ...state.spu, ...newRecords ];
		// 	state.spuId = newRecords[0].id;
		// 	return { ...state };
		// },
		// addSKU(state, { newRecords }) {
		// 	state.sku = [ ...state.sku, ...newRecords ];
		// 	state.skuId = newRecords[0].id;
		// 	return { ...state };
		// }
	}
};
