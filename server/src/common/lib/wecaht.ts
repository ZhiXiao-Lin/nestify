import * as crypto from 'crypto';
import * as SuperAgent from 'superagent';
import config from '../../config';

export class Wechat {

    // 校验签名
    static async checkSignature(signature: string, timestamp: string, nonce: string): Promise<boolean> {
        return crypto.createHash('sha1')
            .update([config.wechat.token, timestamp, nonce].sort().join(''))
            .digest('hex') === signature;
    }

    // 通过code换取网页授权access_token
    static async getAccessToken(code: string) {

        // https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
        // { 
        //     "access_token":"ACCESS_TOKEN",
        //     "expires_in":7200,
        //     "refresh_token":"REFRESH_TOKEN",
        //     "openid":"OPENID",
        //     "scope":"SCOPE" 
        // }
        return await SuperAgent.get(`https://api.weixin.qq.com/sns/oauth2/access_token?
            appid=${config.wechat.appid}
            &
            secret=${config.wechat.secret}
            &
            code=${code}
            &
            grant_type=authorization_code`);
    }

    // 拉取用户信息(需scope为 snsapi_userinfo)
    static async getUserInfo(accessToken: string, openid: string) {

        // https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN
        // {   
        //     "openid":" OPENID",
        //     "nickname": NICKNAME,
        //     "sex":"1",
        //     "province":"PROVINCE"
        //     "city":"CITY",
        //     "country":"COUNTRY",
        //     "headimgurl": "http://thirdwx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46",
        //     "privilege":[ "PRIVILEGE1" "PRIVILEGE2"     ],
        //     "unionid": "o6_bmasdasdsad6_2sgVt7hMZOPfL"
        // }
        return await SuperAgent.get(`https://api.weixin.qq.com/sns/userinfo?
            access_token=${accessToken}
            &
            openid=${openid}
            &
            lang=zh_CN`);
    }
}