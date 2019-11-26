import { LoggerService } from "@nestify/logger";
import { LOGGER_SERVICE } from "./constants";

export const LoggerProvider = {
    provide: LOGGER_SERVICE,
    useExisting: LoggerService
};