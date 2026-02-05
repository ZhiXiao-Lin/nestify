import { DomainException } from '@/shared/presentation/filters/domain-exception.filter';

export class OrderNotFoundException extends DomainException {
    constructor(orderId: string) {
        super(`Order with id ${orderId} not found`);
    }
}
