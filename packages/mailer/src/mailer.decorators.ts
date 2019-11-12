import { Inject } from '@nestjs/common';
import { MAILER_MODULE_OPTIONS, MAILER_TRANSPORTER } from './mailer.constants';

export const InjectMailerModuleOptions = (): ParameterDecorator => Inject(MAILER_MODULE_OPTIONS);
export const InjectMailerTransporter = (): ParameterDecorator => Inject(MAILER_TRANSPORTER);