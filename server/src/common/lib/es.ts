import * as elasticsearch from 'elasticsearch';
import * as esb from 'elastic-builder';
import { config } from '../../config';
import { Logger } from './logger';

const es = new elasticsearch.Client({
    ...config.es,
    log: Logger
});

// es.ping(
//     {
//         requestTimeout: 3000
//     },
//     (error) => {
//         if (error) {
//             Logger.error('elasticsearch cluster is down!');
//         } else {
//             Logger.log('All is well');
//         }
//     }
// );

export { es, esb };
export default es;
