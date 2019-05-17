import { Repository } from 'typeorm';

export abstract class BaseService<T> {
	constructor(private readonly repository: Repository<T>) {}

	async remove(ids: string[]) {
		return await this.repository.delete(ids);
	}
}
