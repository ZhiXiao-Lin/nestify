import _ from 'lodash';
import axios from 'axios';
import router from 'umi/router';
import { message } from 'antd';
import config from '@/config';

const instance = axios.create({
	baseURL: config.API_ROOT,
	timeout: 15000,
	headers: {}
});

// Add a request interceptor
instance.interceptors.request.use(
	function(config) {
		// Do something before request is sent
		config.headers.Authorization = 'Bearer ' + localStorage.getItem('token');
		console.log('onRequest --->', config);
		return config;
	},
	function(error) {
		// Do something with request error
		return Promise.reject(error);
	}
);

// Add a response interceptor
instance.interceptors.response.use(
	function(response) {
		return response.data;
	},
	function(error) {
		// Do something with response error

		if (error.response) {
			// The request was made and the server responded with a status code
			// that falls out of the range of 2xx

			if (!!error.response.data.message) {
				const msg = error.response.data.message.message;
				console.log(msg);
				console.log(error.response.status);
				console.log(error.response.headers);
				if (_.isString(msg)) {
					message.error(msg, 2);
				} else {
					if (_.isArray(msg)) {
						const constraints = msg.pop().constraints;

						message.error(constraints[Object.keys(constraints).pop()], 2);
					} else {
						if (error.response.status === 401) {
							message.error('验证失效，请重新登录!', 2);

							router.replace('/user/login');
						} else {
							message.error('未知错误!', 2);
						}
					}
				}
			}
		} else if (error.request) {
			message.error('请求超时!', 2);
			// The request was made but no response was received
			// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
			// http.ClientRequest in node.js
			console.log(error.request);
		} else {
			message.error('未知错误!', 2);
			// Something happened in setting up the request that triggered an Error
			console.log('Error', error.message);
		}

		return Promise.reject(error);
	}
);

export function apiUploadOne(file, options = {}) {
	const param = new FormData();
	param.append('file', file, file.name);

	return instance.post('/upload', param, options);
}

export function apiGet(url, options) {
	return instance.get(url, options);
}

export function apiPost(url, data, options) {
	return instance.post(url, data, options);
}

export function apiPut(url, data, options) {
	return instance.put(url, data, options);
}

export function apiDelete(url, options) {
	return instance.delete(url, options);
}
