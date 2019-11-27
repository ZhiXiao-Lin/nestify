import { env } from '@nestify/config';

export default {
    connection: {
        uri: 'mongodb://127.0.0.1:27017',
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        user: 'nestify',
        pass: env('MONGO_PASS'),
        dbName: 'nestify'
    }
}