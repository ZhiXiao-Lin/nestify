import * as moment from 'moment';
import { Logger } from '@nestjs/common';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	constructor() {}

	catch(exception: any, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();
		const status = exception.getStatus();

		const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

		Logger.error(`Catch http exception at ${request.raw.method} ${request.raw.url} ${status}`);
		Logger.error(exception);

		response.code(status).header('Content-Type', 'application/json; charset=utf-8').send({
			...exception,
			timestamp,
			path: request.url
		});
	}
}
