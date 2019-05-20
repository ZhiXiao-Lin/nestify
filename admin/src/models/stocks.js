import superFetch from '@/utils/apirequest';
import { treeInitial } from '@/utils/tree';
import config from '../utils/config';

const BACKEND_API_URL = config.API_URL.STOCKS;
const BACKEND_API_INVENTORIES = `${BACKEND_API_URL}/inventories`;
const BACKEND_API_RESERVATIONS = `${BACKEND_API_URL}/reservations`;

export default {
	namespace: 'stocks',

	state: {
		inventories: [],
		inventoriyId: null,
		criteriaINV: null,

		reservations: [],
		reservationId: null,
		criteriaRES: null
	},

	effects: {
		*fetchInventories({ payload }, { call, put }) {
			const criteriaINV = payload;
			const inventories = yield call(superFetch.get, BACKEND_API_INVENTORIES, criteriaINV);

			yield put({
				type: 'set',
				payload: { inventories, criteriaINV }
			});
		},

		*updateInventories({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, BACKEND_API_INVENTORIES, payload);
			if (!result) return;

			const criteriaINV = yield select((state) => state.stocks.criteriaINV);
			const inventories = yield call(superFetch.get, BACKEND_API_INVENTORIES, criteriaINV);
			if (!inventories) return;

			yield put({
				type: 'set',
				payload: { inventories }
			});
		},

		*createInventories({ payload }, { call, put }) {
			const newRecords = yield call(superFetch.post, BACKEND_API_INVENTORIES, payload);
			if (!newRecords || newRecords instanceof Error || newRecords.length === 0) {
				return;
			}
			yield put({ type: 'addInventories', newRecords });
		},

		*deleteInventories({ payload }, { call, put, select }) {
			const result = yield call(superFetch.delete, BACKEND_API_INVENTORIES, payload);
			if (!result) return;
			const criteriaINV = yield select((state) => state.stocks.criteriaINV);
			const inventories = yield call(superFetch.get, BACKEND_API_INVENTORIES, criteriaINV);
			if (!inventories) return;
			yield put({
				type: 'set',
				payload: { inventories }
			});
		},

		*fetchReservations({ payload }, { call, put, select }) {
			const criteriaRES = payload;
			const reservations = yield call(superFetch.get, BACKEND_API_RESERVATIONS, criteriaRES);

			yield put({
				type: 'set',
				payload: { reservations, criteriaRES }
			});
		},

		*updateReservations({ payload }, { call, put, select }) {
			const result = yield call(superFetch.put, BACKEND_API_RESERVATIONS, payload);
			if (!result) return;

			const criteriaRES = yield select((state) => state.stocks.criteriaRES);
			const reservations = yield call(superFetch.get, BACKEND_API_RESERVATIONS, criteriaRES);
			if (!reservations) return;

			yield put({
				type: 'set',
				payload: { reservations }
			});
		}
	},

	reducers: {
		set(state, { payload }) {
			if (!payload) return;
			return { ...state, ...payload };
		},
		addInventories(state, { newRecords }) {
			state.inventories = [ ...state.inventories, ...newRecords ];
			state.inventoriyId = newRecords[0].id;
			return { ...state };
		}
	}
};
