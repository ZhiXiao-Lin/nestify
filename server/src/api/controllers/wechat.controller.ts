import { isEmpty } from 'lodash';
import { Get, Query, UnauthorizedException, Res, HttpStatus } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { Api } from '../../common/aspects/decorator';
import { UserService } from '../../common/services/user.service';
import { Logger } from '../../common/lib/logger';
import { Wechat } from '../../common/lib/wecaht';
import config from '../../config';
import { User } from '../../common/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../../common/entities/role.entity';
import { Gender } from '../../common/aspects/enum';


@Api('wechat')
@ApiUseTags('wechat')
export class WechatController {
    constructor(
        private readonly userService: UserService,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>
    ) { }

    @Get('token')
    async token(@Query() payload) {
        Logger.log('wechat signature payload', payload);

        const checkRes = await Wechat.checkSignature(payload.signature, payload.timestamp, payload.nonce);

        return !!checkRes ? payload.echostr : '';
    }

    @Get('login')
    async login(@Res() res, @Query() query) {
        // 重定向到微信
        const redirectUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.wechat.appid}&redirect_uri=${config.serverUrl}/api/wechat/callback?appUrl=${query.appUrl || config.appUrl}&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`;

        Logger.log('wechat redirectUrl', redirectUrl);

        return res.code(HttpStatus.FOUND).redirect(redirectUrl);
    }

    @Get('callback')
    async callback(@Query() payload, @Res() res) {

        Logger.log('wechat code callback', payload);

        if (isEmpty(payload.code)) throw new UnauthorizedException('获取 code 错误');

        const accessInfo = await Wechat.getAccessToken(payload.code);

        Logger.log('wechat accessInfo', accessInfo);

        if (isEmpty(accessInfo)) throw new UnauthorizedException('访问令牌错误');

        // 通过 openid 查询用户是否存在，存在则直接登陆
        let user = await this.userService.findOne({ wechatOpenid: accessInfo['openid'] });

        Logger.log('find user', user);

        if (isEmpty(user)) {
            const userInfo = await Wechat.getUserInfo(accessInfo['access_token'], accessInfo['openid']);
            Logger.log('wechat userInfo', userInfo);

            const role = await this.roleRepository.findOne({ where: { token: 'user' } });

            // 注册用户
            user = new User();
            user.account = userInfo.openid;
            user.wechatOpenid = userInfo.openid;
            user.wechatUnionid = userInfo.unionid;
            user.nickname = userInfo.nickname;
            user.gender = (userInfo.sex <= 0 ? 1 : userInfo.sex - 1) as Gender;
            user.avatar = { storageType: "local", path: userInfo.headimgurl };
            user.role = role;

            await this.userService.save(user);

            Logger.log('wechat auto register', user.account);
        }

        const token = await this.userService.getToken(user);
        const redirectUrl = `${payload.appUrl}?token=${token}`;

        Logger.log('wechat auto login', user.account);

        return res.code(HttpStatus.FOUND).redirect(redirectUrl);
    }
}
