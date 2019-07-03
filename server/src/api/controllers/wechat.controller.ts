import { isEmpty } from 'lodash';
import { Get, Query, UnauthorizedException } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { Api } from '../../common/aspects/decorator';
import { UserService } from '../../common/services/user.service';
import { Logger } from '../../common/lib/logger';
import { Wechat } from '../../common/lib/wecaht';

@Api('wechat')
@ApiUseTags('wechat')
export class WechatController {
    constructor(private readonly userService: UserService) { }

    @Get('token')
    async token(@Query() payload) {
        Logger.log('wechat signature payload', payload);

        const checkRes = await Wechat.checkSignature(payload.signature, payload.timestamp, payload.nonce);

        return !!checkRes ? payload.echostr : '';
    }

    @Get('login')
    async login(@Query() payload) {
        // https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx2e0e0c1fb73f8dbc&redirect_uri=http://atlantis.yg-net.com/api/wechat/login&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect

        Logger.log('wechat code callback', payload);

        if (!payload.code) throw new UnauthorizedException('无法获取授权信息');

        const accessInfo = await Wechat.getAccessToken(payload.code);

        Logger.log('wechat accessInfo', accessInfo);

        if (isEmpty(accessInfo)) throw new UnauthorizedException('访问令牌错误');

        // TODO: 通过 openid 查询用户是否存在，存在则直接登陆

        const userInfo = await Wechat.getUserInfo(accessInfo['access_token'], accessInfo['openid']);

        Logger.log('wechat userInfo', userInfo);

        // TODO: 注册用户

        return userInfo;
    }
}
