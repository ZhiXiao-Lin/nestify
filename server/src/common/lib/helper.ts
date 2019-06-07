export function textInterception(text, length = 120) {
    return text.length >= length ? text.substr(0, length) + '...' : text;
}

export function extractionTextInHtml(html) {
    return !!html ? html.replace(new RegExp('<.+?>', 'g'), '') : '';
}
