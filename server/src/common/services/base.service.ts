import { Repository } from 'typeorm';

export abstract class BaseService<T> {
    constructor(private readonly repository: Repository<T>) {}

    async findOneById(id: string) {
        return await this.repository.findOne(id);
    }

    async remove(ids: string[]) {
        return await this.repository.remove(await this.repository.findByIds(ids));
    }
}
