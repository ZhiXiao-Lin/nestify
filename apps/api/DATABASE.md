# Database Setup

This project uses PostgreSQL with Kysely for type-safe SQL queries.

## Prerequisites

- PostgreSQL 14+
- pnpm 8+

## Setup

### 1. Start PostgreSQL

Using Docker:
```bash
cd docker
docker-compose up -d postgres
```

Or use your local PostgreSQL installation.

### 2. Create Database

```bash
createdb nestify
```

### 3. Run Migrations

```bash
psql -d nestify -f apps/api/migrations/001_create_orders_tables.sql
```

### 4. Configure Environment

Create `.env` file in the root:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nestify

# Application
NODE_ENV=development
PORT=3000
```

## Running the Application

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build:packages

# Start development server
pnpm start:dev
```

The API will be available at http://localhost:3000/api

## API Endpoints

### Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "product-456",
        "quantity": 2,
        "unitPrice": 10.99
      }
    ]
  }'
```

### Get Order
```bash
curl http://localhost:3000/api/orders/{orderId}
```

### List Orders by Customer
```bash
curl http://localhost:3000/api/orders?customerId=customer-123
```

### Confirm Order
```bash
curl -X POST http://localhost:3000/api/orders/{orderId}/confirm
```

### Cancel Order
```bash
curl -X POST http://localhost:3000/api/orders/{orderId}/cancel
```

## Database Schema

### orders table
- `id` (UUID, Primary Key)
- `customer_id` (VARCHAR)
- `status` (VARCHAR: 'pending', 'confirmed', 'cancelled')
- `total_amount` (DECIMAL)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### order_items table
- `id` (UUID, Primary Key)
- `order_id` (UUID, Foreign Key)
- `product_id` (VARCHAR)
- `quantity` (INTEGER)
- `unit_price` (DECIMAL)
- `subtotal` (DECIMAL)
- `created_at` (TIMESTAMP)

## Using Kysely in Your Code

```typescript
import { Injectable } from '@nestjs/common';
import { KyselyService } from '@a3s-lab/kysely';
import { Database } from '@/shared/database/database.types';

@Injectable()
export class MyRepository {
  constructor(private readonly db: KyselyService<Database>) {}

  async findAll() {
    return this.db
      .selectFrom('orders')
      .selectAll()
      .execute();
  }

  async create(data: NewOrder) {
    return this.db
      .insertInto('orders')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, data: OrderUpdate) {
    return this.db
      .updateTable('orders')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(id: string) {
    await this.db
      .deleteFrom('orders')
      .where('id', '=', id)
      .execute();
  }
}
```

## Transactions

```typescript
async saveWithTransaction(order: Order) {
  return await this.db.transaction().execute(async (trx) => {
    // Insert order
    await trx
      .insertInto('orders')
      .values(orderData)
      .execute();

    // Insert order items
    await trx
      .insertInto('order_items')
      .values(itemsData)
      .execute();

    return order;
  });
}
```

## Query Logging

Kysely logger is enabled in development mode and will show:
- SQL queries with syntax highlighting
- Query parameters
- Execution time with color coding:
  - Green: < 1ms (excellent)
  - Yellow: 1-100ms (acceptable)
  - Red: > 100ms (needs optimization)
