import config from './_config';

export default async function (method, url, body, header) {
	let headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('application', config.application);
	headers.append('authorization', localStorage.getItem('u_token'));
    if (!!header) {
        Object.keys(header).forEach((key) => headers.append(key, header[key]))
    }
    let init = {
        method: method,
        headers: headers,
        // mode: 'cors',
        cache: 'default',
    };
    if (method.toUpperCase() !== 'GET' && !!body) {
        if (body instanceof FormData) {
            Object.assign(init, { body: body })
        } else {
            Object.assign(init, { body: JSON.stringify(body) })
        }
    }
    console.log(init);
    
	let response = await fetch(url, init);
	return response.json();
}