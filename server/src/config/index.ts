import * as _ from 'lodash';
import * as baseConfig from './base.config';
import * as productionConfig from './production.config';
import * as localConfig from './local.config';

let config = baseConfig.default;

if (process.env.NODE_ENV === 'production') {
	config = _.merge(config, productionConfig.default);
}

if (!!process.env.DB_SYNC) {
	config = _.merge(config, localConfig.default);
}

export { config };
export default config;
