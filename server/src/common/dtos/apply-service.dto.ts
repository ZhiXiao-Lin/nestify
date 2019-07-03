import { IsMobilePhone, IsNotEmpty, ValidateIf, IsDateString, IsUUID } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';

export class ApplyServiceDto {

    @ApiModelProperty()
    @IsUUID('4', {
        message: '服务编号不正确'
    })
    readonly id: string;

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
    readonly address: string;

    @ApiModelProperty()
    @ValidateIf(e => !!e.date)
    @IsDateString()
    readonly date: string;

    @ApiModelProperty()
    readonly other: string;
}
