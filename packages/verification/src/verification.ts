import * as svg from 'svg-captcha';

export type VerifyCodeOption = {
    numbers?: boolean | string;
    letters?: boolean | string;
    specials?: boolean | string;
};

export class Verification {
    static numbers: string = '0123456789';
    static letters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    static specials: string = '~!@#$%^*()_+-=[]{}|;:,./<>?';

    static loadFont(url: string) {
        return svg.loadFont(url);
    }

    static captcha(options: svg.ConfigObject) {
        return svg.create(options);
    }

    static expression(options: svg.ConfigObject) {
        return svg.createMathExpr(options);
    }

    static text(length: number = 4) {
        return svg.randomText(length);
    }

    static number(length: number = 4) {
        return Verification.code(length, { numbers: true });
    }

    static code(length: number = 4, options: VerifyCodeOption | string = null) {
        if (length <= 0) return null;

        let chars: string = '';
        let result: string = '';

        if (!options) {
            chars = Verification.numbers + Verification.letters + Verification.specials;
        } else if (typeof options == 'string') {
            chars = options;
        } else {
            if (!!options.numbers) {
                chars += typeof options.numbers === 'string' ? options.numbers : Verification.numbers;
            }

            if (!!options.letters) {
                chars += typeof options.letters === 'string' ? options.letters : Verification.letters;
            }

            if (!!options.specials) {
                chars += typeof options.specials === 'string' ? options.specials : Verification.specials;
            }
        }

        while (length > 0) {
            length--;
            result += chars[Math.floor(Math.random() * chars.length)];
        }

        return result;
    }
}
