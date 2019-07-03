import { Get, Query } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { Api } from '../../common/aspects/decorator';
import { UserService } from '../../common/services/user.service';
import { Logger } from '../../common/lib/logger';
import { Wechat } from '../../common/lib/wecaht';

@Api('wecaht')
@ApiUseTags('wecaht')
export class WechatController {
    constructor(private readonly userService: UserService) { }

    @Get('token')
    async login(@Query() payload) {
        Logger.log('wecaht signature payload', payload);

        const checkRes = await Wechat.checkSignature(payload.signature, payload.timestamp, payload.nonce);

        return !!checkRes ? payload.echostr : '';
    }
}
