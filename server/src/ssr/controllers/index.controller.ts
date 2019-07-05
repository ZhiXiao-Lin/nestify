import { Controller } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';

@Controller()
export class IndexController {
    constructor(private readonly commonService: CommonService) { }
}
