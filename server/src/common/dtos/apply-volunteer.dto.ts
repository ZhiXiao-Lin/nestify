import { IsMobilePhone, IsNotEmpty } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';

export class ApplyVolunteerDto {
    @ApiModelProperty()
    @IsNotEmpty({
        message: '姓名不能为空'
    })
    readonly realName: string;

    @ApiModelProperty()
    @IsMobilePhone('zh-CN', {
        message: '手机号无效'
    })
    @IsNotEmpty({
        message: '手机号不能为空'
    })
    readonly phone: string;

    @ApiModelProperty()
    @IsNotEmpty({
        message: '身份证号不能为空'
    })
    readonly idCard: string;

    @ApiModelProperty()
    @IsNotEmpty({
        message: '联系地址不能为空'
    })
    readonly address: string;
}
