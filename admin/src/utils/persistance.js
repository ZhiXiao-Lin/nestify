
export function setKeyValue ( key, value ) {
    localStorage.setItem(key, value);
}
export function getKeyValue (key) {
	return localStorage.getItem(key);
}
export function removeKey (key) {
	localStorage.removeItem(key);
}
export function flushAll () {
	localStorage.clear();
}
