import superFetch from './apirequest';
import { message } from 'antd';

import config from './config';
const gAMapKEY = config.AMAP.KEY;

export function toSearchAddressByAMapAPI(address) {
	return fetch(`http://restapi.amap.com/v3/place/text?key=${gAMapKEY}&keywords=${address}`).then((res) => res.json());
}

export function toCalculateTheBoundaryOfMarkers(pois) {
	let maxLongitude = Number.MIN_VALUE;
	let minLongitude = Number.MAX_VALUE;
	let maxLatitude = Number.MIN_VALUE;
	let minLatitude = Number.MAX_VALUE;
	pois.forEach((item, i) => {
		const [ longitude, latitude ] = item.location.split(',');
		maxLongitude = Math.max(maxLongitude, longitude);
		minLongitude = Math.min(minLongitude, longitude);
		maxLatitude = Math.max(maxLatitude, latitude);
		minLatitude = Math.min(minLatitude, latitude);
	});
	return {
		topLeft: [ minLongitude, maxLatitude ],
		bottomRight: [ maxLongitude, minLatitude ],
		topRight: [ maxLongitude, maxLatitude ],
		bottomLeft: [ minLongitude, minLatitude ]
	};
}

export function toGetZoomByDistance(distance) {
	// 手动地图缩放
	const curHeight = 450;
	if (distance / curHeight <= 50 / 110) return 18;
	else if (distance / curHeight <= 100 / 110) return 17;
	else if (distance / curHeight <= 200 / 110) return 16;
	else if (distance / curHeight <= 200 / 50) return 15;
	else if (distance / curHeight <= 300 / 60) return 14;
	else if (distance / curHeight <= 1000 / 60) return 13;
	else if (distance / curHeight <= 2000 / 60) return 12;
	else if (distance / curHeight <= 5000 / 80) return 11;
	else if (distance / curHeight <= 10000 / 80) return 10;
	else if (distance / curHeight <= 20000 / 80) return 9;
	else if (distance / curHeight <= 50000 / 110) return 8;
	else if (distance / curHeight <= 100000 / 110) return 7;
	else if (distance / curHeight <= 100000 / 50) return 6;
	else if (distance / curHeight <= 200000 / 50) return 5;
	else if (distance / curHeight <= 500000 / 80) return 4;
	else if (distance / curHeight <= 1000000 / 60) return 3;
	else return 3;
}

export function toGetMarkerByPositionArray(pois) {
	try {
		if (pois.length === 0) {
			message.info('很抱歉，没有搜索到相应地址');
			throw '很抱歉，没有搜索到相应地址';
			return [];
		} else {
			const markers = [];
			pois.forEach((item, i) => {
				const [ longitude, latitude ] = item.location.split(',');
				const address = `${item.pname}${item.cityname}${item.adname}${item.address}${item.name}`;
				markers.push({
					position: {
						longitude: longitude,
						latitude: latitude
					},
					label: address,
					index: i + 1
				});
			});
			return markers;
		}
	} catch (err) {
		console.error(err);
		return [];
	}
}
