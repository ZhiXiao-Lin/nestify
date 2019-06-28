import * as Youch from 'youch';
import * as moment from 'moment';
import { Catch, ArgumentsHost, HttpException, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Logger } from '../lib/logger';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
    async catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        Logger.error('exception', exception);

        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            Logger.error(
                `Catch http exception at ${request.raw.method} ${request.raw.url} ${status}`
            );

            response
                .code(status)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send({
                    ...exception,
                    timestamp,
                    path: request.url
                });
        } else {
            if (process.env.NODE_ENV !== 'production' && !request.headers.xhr) {
                Logger.error('INTERNAL_SERVER_ERROR --->');
                const youch = new Youch(exception, request.raw);

                const html = await youch
                    .addLink(({ message }) => {
                        const url = `https://cn.bing.com/search?q=${encodeURIComponent(
                            `[adonis.js] ${message}`
                        )}`;
                        return `<a href="${url}" target="_blank" title="Search on bing">Search Bing</a>`;
                    })
                    .toHTML();

                response.type('text/html');
                response.code(HttpStatus.INTERNAL_SERVER_ERROR).send(html);
            } else {
                response
                    .code(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header('Content-Type', 'application/json; charset=utf-8')
                    .send({
                        ...exception,
                        timestamp,
                        path: request.url
                    });
            }
        }
    }
}
