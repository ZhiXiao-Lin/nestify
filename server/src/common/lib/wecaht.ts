import * as crypto from 'crypto';
import config from '../../config';

export class Wechat {
    static async checkSignature(signature: string, timestamp: string, nonce: string): Promise<boolean> {
        return crypto.createHash('sha1')
            .update([config.wechat.token, timestamp, nonce].sort().join(''))
            .digest('hex') === signature;
    }
}