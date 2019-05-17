import * as UUID from 'uuid';
import * as moment from 'moment';
import { ApiUseTags, ApiConsumes, ApiImplicitFile, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Post, Req, Res, Logger, BadRequestException, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { config } from '../../config';
import { Api } from '../../common/aspects/decorator';
import { resolve } from 'path';
import { UploadActionType } from '../../common/aspects/enum';
import { ImportService } from '../../common/services/import.service';

@Api('storage')
@ApiUseTags('storage')
@ApiBearerAuth()
@UseGuards(AuthGuard())
export class StorageController {
	constructor(private readonly importService: ImportService) {}

	@Post()
	@ApiConsumes('multipart/form-data')
	@ApiImplicitFile({ name: 'file', required: true })
	async upload(@Req() req, @Res() res) {
		const files = req.raw.files;

		if (Object.keys(files).length == 0) {
			throw new BadRequestException('没有上传任何文件');
		}

		const file = files.file;
		const action = req.raw.body.action || UploadActionType.UPLOAD;

		switch (action) {
			case UploadActionType.IMPORT:
				const target = req.raw.body.target;
				if (!target) throw new BadRequestException('参数 target 缺失');

				Logger.log(target, 'StorageController::import');

				try {
					res.send(await this.importService.handleFile(file, target));
				} catch (err) {
					Logger.error(err);

					throw new BadRequestException('导入失败');
				}
				break;
			default:
				const path = `${moment().format('YYYY-MM-DD')}/${UUID.v4()}-${file.name}`;
				const filePath = `${resolve(config.static.root)}${config.static.uploadPath}/${path}`;

				Logger.log(filePath, 'StorageController::upload');

				file.mv(filePath, (err) => {
					if (err) throw new InternalServerErrorException('文件移动失败', err);

					res.send({
						path: `${config.static.uploadPath}/${path}`,
						filePath,
						name: file.name,
						size: file.size,
						md5: file.md5,
						mimetype: file.mimetype
					});
				});
				break;
		}
	}
}
