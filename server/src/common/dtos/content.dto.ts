import { ApiModelProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateContentDto {
	@ApiModelProperty()
	@IsNotEmpty({
		message: '标题不能为空'
	})
	readonly title: string;

	@ApiModelProperty() readonly author: string;

	@ApiModelProperty() readonly sort: number;

	@ApiModelProperty() readonly thumbnail: string;

	@ApiModelProperty() readonly summary: string;

	@ApiModelProperty() readonly text: string;

	@ApiModelProperty() readonly views: number;

	@ApiModelProperty()
	@IsNotEmpty({
		message: '发布时间不能为空'
	})
	readonly publish_at: string;
}

export class CreateContentDto {
	@ApiModelProperty()
	@IsNotEmpty({
		message: '标题不能为空'
	})
	readonly title: string;

	@ApiModelProperty() readonly author: string;

	@ApiModelProperty() readonly sort: number;

	@ApiModelProperty() readonly thumbnail: string;

	@ApiModelProperty() readonly summary: string;

	@ApiModelProperty() readonly text: string;

	@ApiModelProperty() readonly views: number;

	@ApiModelProperty()
	@IsNotEmpty({
		message: '发布时间不能为空'
	})
	readonly publish_at: string;
}
