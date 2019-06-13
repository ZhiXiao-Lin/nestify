module.exports = {
    type: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    database: 'nestify',
    username: 'nestify',
    password: '123456',
    logging: true,
    entities: ['./**/*.entity.ts']
};
