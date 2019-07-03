import * as crypto from 'crypto';

export class Wechat {
    static async checkSignature(signature: string, timestamp: string, nonce: string): Promise<boolean> {
        return crypto.createHash('sha1')
            .update([signature, timestamp, nonce].sort().join(''))
            .digest('hex') === signature;
    }
}