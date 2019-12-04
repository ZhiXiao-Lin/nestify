import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CRYPT_MODULE_OPTIONS } from './crypt.constants';
import { CryptModuleOptions } from './crypt.interfaces';

@Injectable()
export class CryptService {
    constructor(
        @Inject(CRYPT_MODULE_OPTIONS)
        private readonly options: CryptModuleOptions
    ) {}

    async encrypt(str: string): Promise<string> {
        return await bcrypt.hash(str + this.options.salt, await bcrypt.genSalt());
    }

    async compare(str: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(str + this.options.salt, hash);
    }
}
