import { Controller, Res, Get } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';

@Controller()
export class IndexController {
    constructor(private readonly commonService: CommonService) { }

    @Get()
    async index(@Res() res) {
        const siteInfo = await this.commonService.getSiteInfo();

        return res.render('/', {
            siteInfo
        });
    }
}
