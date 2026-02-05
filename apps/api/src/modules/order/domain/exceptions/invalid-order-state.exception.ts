import { DomainException } from '@/shared/presentation/filters/domain-exception.filter';

export class InvalidOrderStateException extends DomainException {
    constructor(message: string) {
        super(message);
    }
}
