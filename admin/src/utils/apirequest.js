import _ from 'lodash';
import fetch from 'dva/fetch';
import router from 'umi/router';
import { notification } from 'antd';
import { getKeyValue } from '../utils/persistance';
import config from './config';

const gAppName = config.APP_NAME;
const gApiRoot = config.API_ROOT;
const gApiUploadBackend = config.API_URL.UPLOAD.BACKEND_STORAGE;
const gUrlRoot = config.LOCAL_URL.ROOT;

const PERSISTANCE_KEY_USER = config.PERSISTANCE.USER.KEY;

const codeMessage = {
	200: '服务器成功返回请求的数据。',
	201: '新建或修改数据成功。',
	202: '一个请求已经进入后台排队（异步任务）。',
	204: '删除数据成功。',
	400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
	401: '用户没有权限（令牌、用户名、密码错误）。',
	403: '用户得到授权，但是访问是被禁止的。',
	404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
	406: '请求的格式不可得。',
	410: '请求的资源被永久删除，且不会再得到的。',
	422: '当创建一个对象时，发生一个验证错误。',
	500: '服务器发生错误，请检查服务器。',
	502: '网关错误。',
	503: '服务不可用，服务器暂时过载或维护。',
	504: '网关超时。'
};

const checkStatus = (response) => {
	if (response.status >= 200 && response.status < 300) {
		return response;
	}
	const errortext = codeMessage[response.status] || response.statusText;
	notification.error({
		message: `请求错误 ${response.status}: ${response.url}`,
		description: errortext
	});
	const error = new Error(errortext);
	error.name = response.status;
	error.response = response;
	throw error;
};

/**
 * Requests a URL, returning a promise.
 *
 * @param  {string} method   method of 'get', 'post', 'put', 'delete'
 * @param  {string} url      The URL we want to request
 * @param  {object} payload  The parameters for 'get' or 'body' for other methods
 * @return {object}          An object containing either "data" or "err"
 */
const basicFetch = async (method, url, payload = null, extra = null) => {
	const options = { method };

	let token = null;
	try {
		const user = JSON.parse(getKeyValue(PERSISTANCE_KEY_USER));
		token = user.token;
	} catch (err) {
		console.error('getKeyValue(PERSISTANCE_KEY_USER) error: ', err);
	}

	options.headers = new Headers(
		Object.assign(
			{
				// "Content-Type"  : "application/json; charset=utf-8",
				'Content-Type': 'application/json',
				Accept: 'application/json',
				application: gAppName,
				authorization: token || undefined
			},
			extra
		)
	);

	if (method === 'get') {
		// payload is query criteria for 'GET'
		if (!!payload && !_.isEmpty(payload)) {
			const query = Object.keys(payload).map((key) => `${key}=${payload[key]}`).join('&');
			url = !query ? url : `${url}?${query}`;
		}
	} else if (payload instanceof FormData) {
		// payload is body for other methods
		options.body = payload;
		options.headers = new Headers(
			Object.assign(
				{
					Accept: 'application/json',
					application: gAppName,
					authorization: token || undefined
				},
				extra
			)
		);
	} else if (!!payload && !_.isEmpty(payload)) {
		options.body = JSON.stringify(payload);
	}

	if (url.indexOf('http:') !== 0) {
		url = `${gApiRoot}${url}`;
	}

	return fetch(url, options)
		.then(checkStatus)
		.then((response) => {
			const contentType = response.headers.get('Content-Type');
			// DELETE and 204 do not return data by default
			// using .json will report an error.
			// if (method === 'delete' || response.status === 204 || contentType === 'text/html; charset=utf-8') {
			if (response.status === 204 || contentType === 'text/html; charset=utf-8') {
				return response.text();
			}

			return response.json();
		})
		.catch((e) => {
			const status = e.name;
			console.error('fetch error: ', e);
			if (status === 401) {
				window.location.href = gUrlRoot;
				return e;
			}
			// environment should not be used
			if (status === 403) {
				router.push('/exception/403');
				return e;
			}
			if (status <= 504 && status >= 500) {
				router.push('/exception/500');
				return e;
			}
			if (status >= 404 && status < 422) {
				router.push('/exception/404');
				return e;
			}
		});
};

const superFetch = {};
[ 'get', 'post', 'put', 'delete' ].forEach((method) => {
	superFetch[method] = basicFetch.bind(null, method);
});
export default superFetch;

export async function apiGet(url, query = null, extra = null) {
	return await basicFetch('get', url, query, extra);
}

export async function apiPost(url, body, extra = null) {
	return await basicFetch('post', url, body, extra);
}

export async function apiPut(url, body, extra = null) {
	return await basicFetch('put', url, body, extra);
}

export async function apiDelete(url, body, extra = null) {
	return await basicFetch('delete', url, body, extra);
}

export async function upload2Backend(file, bucketID, prefixPath, filename, options = {}, extra = null) {
	// console.log("###### upload2Backend: ", file, bucketID, prefixPath, filename, options);

	const formdata = new FormData();
	Object.keys(options).forEach((key) => {
		formdata.append(key, options[key]);
	});
	formdata.append('bucketID', bucketID);
	formdata.append('prefixPath', prefixPath);
	formdata.append('filename', filename);
	formdata.append('file', file, file.name);

	return await basicFetch('post', gApiUploadBackend, formdata, extra);
}
