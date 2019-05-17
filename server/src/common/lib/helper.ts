export function textInterception(text, length = 120) {
	const plainText = !!text ? text.replace(new RegExp('<.+?>', 'g'), '') : '';

	return plainText.length >= length ? plainText.substr(0, length) + '...' : plainText;
}
