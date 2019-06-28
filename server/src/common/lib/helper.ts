import { VIP } from '../aspects/enum';

export function textInterception(text: string, length: number = 120) {
    return text.length >= length ? text.substr(0, length) + '...' : text;
}

export function extractionTextInHtml(html: string) {
    return !!html ? html.replace(new RegExp('<.+?>', 'g'), '') : '';
}

export function getVIP(points: number) {
    if (points <= 0) {
        return VIP.V0;
    } else if (points > 0 && points <= 1000) {
        return VIP.V1;
    } else if (points >= 1000 && points <= 5000) {
        return VIP.V2;
    } else if (points >= 5000 && points <= 20000) {
        return VIP.V3;
    } else if (points >= 20000 && points <= 50000) {
        return VIP.V4;
    } else if (points >= 50000) {
        return VIP.V5;
    }
}
