import { ConsoleModule } from '../console.module';
import { ConsoleModuleTest } from './module';

ConsoleModule.bootstrap({ module: ConsoleModuleTest })
    .then(({ app, boot }) => {
        boot();
    })
    .catch((err) => console.error(err));
