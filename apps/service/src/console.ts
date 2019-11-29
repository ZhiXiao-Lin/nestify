import { ConsoleModule } from '@nestify/console';
import { AppModule } from './app.module';

ConsoleModule.bootstrap({ module: AppModule })
    .then(({ app, boot }) => {
        boot();
    })
    .catch((err) => console.error(err));
