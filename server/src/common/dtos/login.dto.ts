import { IsMobilePhone, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';

export class LoginDto {
	@ApiModelProperty()
	// @IsMobilePhone('zh-CN', {
	// 	message: '手机号无效'
	// })
	@IsNotEmpty({
		message: '帐号不能为空'
	})
	readonly account: string;

	@ApiModelProperty()
	@MinLength(8, {
		message: '密码不能少于8位'
	})
	@MaxLength(12, {
		message: '密码不能大于12位'
	})
	@IsNotEmpty({
		message: '密码不能为空'
	})
	readonly password: string;
}
