import { Inject } from "@nestjs/common";
import { LOGGER_SERVICE } from "./constants";

export const InjectLogger = () => Inject(LOGGER_SERVICE);