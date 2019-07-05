import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';

@Controller()
export class IndexController {
    constructor(private readonly commonService: CommonService) { }

    @Get()
    async index(@Res() res) {
        return res.code(HttpStatus.FOUND).redirect('/api/wechat/login');
    }
}
