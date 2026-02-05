export class CreateOrderCommand {
    constructor(
        public readonly customerId: string,
        public readonly items: Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
        }>,
    ) {}
}
