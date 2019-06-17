import * as qiniu from 'qiniu';
import { config } from '../../config';

export class Qiniu {

    static mac = new qiniu.auth.digest.Mac(config.qiniu.accessKey, config.qiniu.secretKey);

    static putPolicy = new qiniu.rs.PutPolicy(config.qiniu.policy);

    static createUploadToken() {
        return Qiniu.putPolicy.uploadToken(Qiniu.mac);
    }
}