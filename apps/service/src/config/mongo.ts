import { env } from '@nestify/config';

export default {
    connection: {
        uri: env('MONGO_URI'),
        dbName: env('MONGO_DB_NAME'),
        user: env('MONGO_USER'),
        pass: env('MONGO_PASS'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    }
};
