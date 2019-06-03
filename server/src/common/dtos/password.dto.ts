import { MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';

export class PasswordDto {

	@ApiModelProperty()
	@MinLength(8, {
		message: '旧密码不能少于8位'
	})
	@MaxLength(12, {
		message: '旧密码不能大于12位'
	})
	@IsNotEmpty({
		message: '旧密码不能为空'
	})
	readonly oldPassword: string;

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
