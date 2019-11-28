import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository, Repository } from 'src/common/core';
import { BeforeLoad } from '../../common/core';
import { User } from './user.interface';
import { UserModelName } from './user.model';

@Repository()
export class UserRepository extends BaseRepository<User> {
    constructor(
        @InjectModel(UserModelName)
        protected readonly model: Model<User>
    ) {
        super(model);
    }

    @BeforeLoad()
    beforeLoad() {
        this.logger.info('befor load');
    }
}
