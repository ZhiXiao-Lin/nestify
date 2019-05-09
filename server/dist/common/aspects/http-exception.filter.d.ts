import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class HttpExceptionFilter implements ExceptionFilter {
    constructor();
    catch(exception: any, host: ArgumentsHost): void;
}
