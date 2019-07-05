import { Logger } from '../lib/logger';

export function logger(req, res, next) {
	const statusCode = res.statusCode;
	const logFormat = `${req.method} ${req.originalUrl} ${req.ip} ${statusCode}`;

	next();

	if (statusCode >= 500) {
		Logger.error(logFormat);
	} else if (statusCode >= 400) {
		Logger.warn(logFormat);
	} else {
		Logger.log(logFormat);
	}
}