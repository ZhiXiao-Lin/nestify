const withCSS = require('@zeit/next-css');
const withLess = require('@zeit/next-less');

module.exports = withLess(withCSS());
