import { Injectable } from '@nestjs/common';
import { Logger } from '../lib/logger';

@Injectable()
export class WorkOrderFlow {
    constructor() {}

    get Flow() {
        return {
            待制单: {
                制单: async () => {
                    Logger.log('已制单');
                    return '待派单';
                }
            },
            待派单: {
                派单: async () => {
                    Logger.log('已派单');
                    return '待接单';
                }
            },
            待接单: {
                接单: async () => {
                    Logger.log('已接单');
                    return '待结单';
                }
            },
            待结单: {
                结单: async () => {
                    Logger.log('已结单');
                }
            }
        };
    }
}
