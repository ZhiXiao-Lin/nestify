import { ApiModelProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
export class UpdateContentDto {
	@ApiModelProperty()
	@IsNotEmpty({
		message: '标题不能为空'
	})
	readonly title: string;

	@ApiModelProperty()
	@IsNotEmpty({
		message: '作者不能为空'
	})
	readonly author: string;

	@ApiModelProperty()
	@IsNotEmpty({
		message: '排序不能为空'
	})
	sort: number;

	@ApiModelProperty() thumbnail: string;

	@ApiModelProperty() summary: string;

	@ApiModelProperty() text: string;

	@ApiModelProperty()
	@IsNotEmpty({
		message: '排序不能为空'
	})
	views: number;

	@ApiModelProperty()
	@IsNotEmpty({
		message: '发布时间不能为空'
	})
	publish_at: string;
}
