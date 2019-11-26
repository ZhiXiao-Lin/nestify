const { env } = require('@nestify/config');

module.exports = {
    env: env('NODE_ENV'),
    port: env('PORT'),
    prefix: 'api',
    isDev() {
        const env = this.get('app.env');
        return env === 'development';
    }
};