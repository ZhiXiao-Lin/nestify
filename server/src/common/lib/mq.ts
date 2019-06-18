import * as AMQP from 'amqplib';
import { config } from '../../config';
import { Logger } from './logger';

export enum MQChannel {
    WF = 'WF',
}

export class MQ {
    private client: AMQP.Connection;
    private channel: AMQP.Channel;

    async init() {
        Logger.trace('Message Queue Connecting');

        this.client = await AMQP.connect(config.mq.url, config.mq.options);
        this.channel = await this.client.createChannel();

        Logger.trace('Message Queue Connected');
    }

    get Channel() {
        return this.channel;
    }
}

const mq = new MQ();

export { mq };
export default mq;

