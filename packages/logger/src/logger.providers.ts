import { LOGGER_SERVICE } from "./logger.constants";
import { LoggerService } from "./logger.service";

export const LoggerProvider = {
    provide: LOGGER_SERVICE,
    useExisting: LoggerService
};
