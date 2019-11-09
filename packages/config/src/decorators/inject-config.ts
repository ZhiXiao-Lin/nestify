import { Inject } from '@nestjs/common';
import { ConfigService } from '../config.service';

export const InjectConfig = () => Inject(ConfigService);
