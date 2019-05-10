import * as Youch from 'Youch';
import * as moment from 'moment';
import { Catch, ArgumentsHost, HttpException, ExceptionFilter, Logger } from '@nestjs/common';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();

		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

			Logger.error(`Catch http exception at ${request.raw.method} ${request.raw.url} ${status}`);
			Logger.error(exception);

			response.code(status).header('Content-Type', 'application/json; charset=utf-8').send({
				...exception,
				timestamp,
				path: request.url
			});
		} else {
			if (process.env.NODE_ENV !== 'production') {
				const youch = new Youch(exception, request.raw);

				youch
					.addLink(({ message }) => {
						const url = `ttps://cn.bing.com/search?q=${encodeURIComponent(`[adonis.js] ${message}`)}`;
						return `<a href="${url}" target="_blank" title="Search on bing">Search Bing</a>`;
					})
					.toHTML()
					.then((html) => {
						response.type('text/html');
						response.code(500).send(html);
					});
			}
		}
	}
}
