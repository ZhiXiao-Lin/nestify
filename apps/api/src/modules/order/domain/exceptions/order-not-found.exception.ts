import { DomainException } from '@a3s-lab/http';

export class OrderNotFoundException extends DomainException {
    constructor(orderId: string) {
        super(`Order with id ${orderId} not found`);
    }
}
