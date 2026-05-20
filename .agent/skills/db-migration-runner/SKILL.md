# SKILL.md — DB Migration Runner

Read this before making any change to the database schema or running any Prisma command. This skill defines how schema changes are made, reviewed, and applied safely in this project.

---

## Golden Rules

- Never edit schema.prisma and run a migration without reviewing the generated SQL first
- Never run `prisma migrate deploy` on production without testing the migration locally first
- Never rename a column or model without a multi-step migration — rename = data loss if done carelessly
- Never drop a column that still has data in it without a deprecation step first
- Never use `prisma db push` in this project — it bypasses migration history and causes drift
- Always write a descriptive migration name — not "update" or "change"

---

## Prisma Commands Reference

```bash
# Generate Prisma Client after any schema change
npx prisma generate

# Create and apply a migration in development
npx prisma migrate dev --name describe-what-changed

# Apply all pending migrations in production
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Open Prisma Studio to inspect data locally
npx prisma studio

# Reset the database (development only — destroys all data)
npx prisma migrate reset

# Mark a failed migration as resolved (production recovery only)
npx prisma migrate resolve --applied <migration_name>
npx prisma migrate resolve --rolled-back <migration_name>
```

Never run `prisma migrate reset` outside of local development. It destroys all data.

**Do not use `prisma db push`.** It applies schema changes without creating a migration file, which means no SQL to review, no migration history, and potential drift between your schema and migration state. Always use `prisma migrate dev` instead.

---

## Step-by-Step: Making a Schema Change

**Step 1 — Edit schema.prisma**
Make your change in `server/prisma/schema.prisma`. Only change what is needed.

**Step 2 — Review what you changed**
- What model was affected?
- What field was added, removed, or modified?
- Will any existing data be affected?
- Is this a breaking change for existing queries?

**Step 3 — Run migrate dev locally**
```bash
npx prisma migrate dev --name add-notes-to-delivery-details
```
Prisma will show you the SQL it intends to run. Read it carefully before confirming.

**Step 4 — Verify Prisma Client is updated**
`prisma migrate dev` runs `prisma generate` automatically. You only need to run `npx prisma generate` manually if you edited the schema without migrating (e.g., during prototyping or after pulling new migration files from git).

**Step 5 — Test the affected routes**
Run the app locally and test every route that touches the modified model.

**Step 6 — Commit both files together**
```
server/prisma/schema.prisma
server/prisma/migrations/[timestamp]_describe-what-changed/migration.sql
```
Never commit one without the other.

**Step 7 — Deploy**
```bash
npx prisma migrate deploy
```

---

## Migration Naming Convention

| Bad | Good |
|---|---|
| update | add_notes_to_delivery_details |
| change | rename_status_to_fulfillment_status |
| fix | make_flutterwave_tx_ref_required |
| schema | add_product_archived_status |
| enum | add_cancelled_to_payment_status |

---

## Safe Column Changes

### Adding a nullable column — safe
```prisma
model Product {
  tags String?
}
```

### Adding a required column to an existing table — requires a default
```prisma
model Product {
  sku String @default("")
}
```

### Renaming a column — never do this directly
Prisma treats rename as drop + add, which destroys data. Use two steps:
1. Add new column with a default value
2. Write a script to backfill data from old column to new column
3. Update all queries to use the new column
4. Remove old column in a **separate migration**

### Changing a column type — requires care
Check existing data before attempting. Changing `Float` to `Int` can fail or cause data loss if values cannot be cast. Always test locally with realistic data first.

---

## Enum Changes

Enums in this project: `Role`, `ProductStatus`, `PaymentStatus`, `FulfillmentStatus`, `Category`.

### Adding a new enum value — generally safe
```prisma
enum PaymentStatus { PENDING SUCCESS FAILED CANCELLED }
```
`prisma migrate dev` generates the correct `ALTER TYPE ... ADD VALUE` SQL. This is safe and does not affect existing rows.

### Removing an enum value — dangerous
If any row in the database references the value being removed, the migration **will fail**. Before removing an enum value:
1. Update all rows that use the old value to a different value
2. Update all application code that references the old value
3. Then remove the value from the enum and run the migration

### Renaming an enum value — same caution as columns
PostgreSQL does not support renaming enum values directly. Prisma treats it as drop + add, which fails if existing rows reference the old value. Follow the same multi-step approach as column renames: add new value → backfill rows → remove old value.

---

## Schema Constraints for This Project

- `price` is `Int` (kobo) — not Float, not Decimal
- `flutterwaveTxRef` is required `String` — not optional
- `deliveryDetailsId` is required — delivery details always exist before order creation
- `paymentStatus` defaults to `PENDING` — correct by design
- `fulfillmentStatus` defaults to `PENDING` — updated by admin through order management
- `fulfillmentStatus` follows a logical order: PENDING → PROCESSING → SHIPPED → DELIVERED
- `userId` on `Order` is optional (`String?`) — supports guest checkout if needed
- `stock` on `Product` defaults to `0` — new products start with no stock

---

## Database Indexes

As data grows, add indexes on columns used for filtering and lookups. Define them in `schema.prisma`:

```prisma
model Product {
  // ... fields ...
  @@index([category, status])
}

model Order {
  // ... fields ...
  @@index([userId])
  @@index([paymentStatus])
  @@index([createdAt])
}
```

Add indexes when:
- A query filters or sorts by a column frequently
- A page loads slowly due to full table scans
- You add a new foreign key relationship

Do not add indexes preemptively on every column — each index adds write overhead. Add them when query performance justifies it.

---

## Recovery: When Migrations Fail

### Migration fails locally
Run `npx prisma migrate reset` to start fresh. This is safe in development — it destroys all data and re-applies all migrations from scratch.

### Migration fails in production
**Do NOT run `prisma migrate reset` — this destroys all data.**

1. Check what went wrong:
   ```bash
   npx prisma migrate status
   ```

2. If the migration partially applied, fix the database state manually using raw SQL.

3. Once the database matches what the migration intended, mark it as applied:
   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```

4. If you reverted the changes manually and want to retry later:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

5. After resolving, verify the state:
   ```bash
   npx prisma migrate status
   ```

### Drift detected in production
This means the database schema doesn't match the migration history. Causes include manual SQL changes or a failed migration.

- Run `npx prisma migrate status` to see the exact drift
- Never resolve drift by resetting production
- Fix the drift manually, then use `migrate resolve` to sync the state

---

## Seeding (Development Only)

### Configuration

Add the seed command to the **root** `package.json` (or the `server/package.json` depending on your setup):

```json
{
  "prisma": {
    "seed": "node server/prisma/seed.js"
  }
}
```

Without this, `npx prisma db seed` will not know which script to run.

### Seed Script

```js
// server/prisma/seed.js
import prisma from '../lib/prisma.js'
import bcrypt from 'bcrypt'

async function main() {
  // Use env variable for admin password — never hardcode a real password
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'dev-only-change-me'

  await prisma.user.upsert({
    where: { email: 'admin@shukky.com' },
    update: {},
    create: {
      name: 'Shukky Admin',
      email: 'admin@shukky.com',
      password: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
    },
  })

  await prisma.product.createMany({
    data: [
      {
        name: 'Air Force 1 White',
        price: 4500000,
        images: ['https://res.cloudinary.com/shukky/image/upload/sample-shoe.jpg'],
        description: 'Classic all-white leather sneaker.',
        category: 'SHOES',
        stock: 10,
      },
      {
        name: 'Mini Crossbody Bag',
        price: 2800000,
        images: ['https://res.cloudinary.com/shukky/image/upload/sample-bag.jpg'],
        description: 'Structured leather crossbody with gold hardware.',
        category: 'BAGS',
        stock: 5,
      },
      {
        name: 'Gold Chain Bracelet',
        price: 1200000,
        images: ['https://res.cloudinary.com/shukky/image/upload/sample-bracelet.jpg'],
        description: 'Minimalist gold-tone chain bracelet.',
        category: 'ACCESSORIES',
        stock: 8,
      },
    ],
    skipDuplicates: true,
  })

  console.log('Seed completed successfully')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

Run with: `npx prisma db seed`

Never run the seed script against a production database. The admin password in the seed is for local development only — production admin accounts should be created through a secure onboarding process.

---

## Troubleshooting

**Migration fails with "column already exists"** — Run `npx prisma migrate status` to check, then resolve the conflict manually or use `prisma migrate resolve`.

**Prisma Client out of sync** — Run `npx prisma generate` after any schema change or after pulling new migration files from git.

**Drift detected in production** — Run `npx prisma migrate status` on the production database. See the Recovery section above. Never resolve drift by resetting production.

**"Enum value already exists"** — You're trying to add an enum value that was already added by a previous migration. Check `prisma migrate status` and resolve.

**`npx prisma db seed` fails with "no seed command"** — Add the `prisma.seed` configuration to your `package.json`. See the Seeding section above.
