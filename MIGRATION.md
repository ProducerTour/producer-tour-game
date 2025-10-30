# WordPress to React Migration Guide

This guide helps you migrate data from your WordPress installation to the new React + Node.js platform.

---

## Overview

The WordPress platform uses MySQL with custom tables:
- `wp_users`
- `wp_royalty_producers`
- `wp_royalty_statements`
- `wp_royalty_statement_items`
- `wp_producer_tour_applications`
- `wp_producer_tour_opportunities`

The new platform uses PostgreSQL with Prisma ORM and slightly modified schema for better relational integrity.

---

## Migration Strategy

### Option 1: Fresh Start (Recommended for New Projects)
- Start with empty database
- Use seed data
- Manually re-upload statements
- **Pros:** Clean slate, no legacy issues
- **Cons:** Loses historical data

### Option 2: Partial Migration (Recommended for Existing Data)
- Migrate users and producers
- Re-upload statements (better than migrating due to parser improvements)
- Migrate opportunities and applications
- **Pros:** Keeps user accounts, preserves applications
- **Cons:** Some manual work

### Option 3: Full Migration (Complex)
- Export all data from WordPress
- Transform and import to PostgreSQL
- **Pros:** Complete history preserved
- **Cons:** Time-consuming, potential data inconsistencies

---

## Option 2: Partial Migration (Step-by-Step)

### Step 1: Export WordPress Data

```bash
# SSH into your WordPress server
mysql -u username -p database_name

# Export users
SELECT id, user_email, display_name, user_registered
FROM wp_users
WHERE ID IN (
  SELECT user_id FROM wp_usermeta
  WHERE meta_key = 'wp_capabilities'
  AND meta_value LIKE '%writer%'
)
INTO OUTFILE '/tmp/writers.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

# Export producers
SELECT * FROM wp_royalty_producers
INTO OUTFILE '/tmp/producers.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

# Export opportunities
SELECT * FROM wp_producer_tour_opportunities
INTO OUTFILE '/tmp/opportunities.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

# Export applications
SELECT * FROM wp_producer_tour_applications
INTO OUTFILE '/tmp/applications.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

### Step 2: Create Migration Scripts

Create `apps/backend/scripts/migrate-users.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import Papa from 'papaparse';

const prisma = new PrismaClient();

async function migrateUsers() {
  const csvContent = fs.readFileSync('./data/writers.csv', 'utf-8');
  const { data } = Papa.parse(csvContent, { header: true });

  for (const row of data) {
    const randomPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    await prisma.user.create({
      data: {
        email: row.user_email,
        password: hashedPassword,
        firstName: row.display_name?.split(' ')[0],
        lastName: row.display_name?.split(' ').slice(1).join(' '),
        role: 'WRITER',
      },
    });

    console.log(`Migrated user: ${row.user_email}`);
  }
}

migrateUsers()
  .then(() => console.log('Migration complete'))
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

### Step 3: Link Producers to Users

Create `apps/backend/scripts/migrate-producers.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import Papa from 'papaparse';

const prisma = new PrismaClient();

async function migrateProducers() {
  const csvContent = fs.readFileSync('./data/producers.csv', 'utf-8');
  const { data } = Papa.parse(csvContent, { header: true });

  for (const row of data) {
    const user = await prisma.user.findFirst({
      where: { id: row.user_id }, // Adjust mapping as needed
    });

    if (!user) {
      console.log(`User not found for producer: ${row.producer_name}`);
      continue;
    }

    await prisma.producer.create({
      data: {
        userId: user.id,
        producerName: row.producer_name,
        ipiNumber: row.ipi_number,
        proAffiliation: row.pro_affiliation as any,
        status: row.status,
      },
    });

    console.log(`Migrated producer: ${row.producer_name}`);
  }
}

migrateProducers()
  .then(() => console.log('Migration complete'))
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

### Step 4: Re-upload Statements

Instead of migrating raw statement data:

1. **Download original CSV files** from WordPress uploads folder:
   ```bash
   wp-content/uploads/royalty-statements/
   ```

2. **Use the new admin panel** to re-upload them:
   - Login to React admin dashboard
   - Go to Statements → Upload
   - Select PRO type (BMI/ASCAP/SESAC)
   - Upload CSV
   - Parser will automatically process with improved logic

**Advantages:**
- Leverages improved TypeScript parsers
- Clean data structure
- Better error handling
- Preserves original source files

### Step 5: Migrate Opportunities

Similar script for opportunities table - the schema is nearly identical.

### Step 6: Send Password Reset Emails

After migration, send password reset links to all users:

```typescript
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

async function sendPasswordResets() {
  const users = await prisma.user.findMany({
    where: { role: 'WRITER' },
  });

  for (const user of users) {
    // Generate reset token
    const resetToken = Math.random().toString(36).slice(-20);

    // Send email with reset link
    // TODO: Implement email sending

    console.log(`Reset email sent to: ${user.email}`);
  }
}
```

---

## Option 3: Full Migration Script

For advanced users who want to migrate everything:

```typescript
// apps/backend/scripts/full-migration.ts
import { PrismaClient as MySQLPrisma } from './prisma-mysql-client';
import { PrismaClient as PostgresPrisma } from '@prisma/client';

const mysql = new MySQLPrisma({
  datasources: {
    db: { url: 'mysql://user:pass@localhost:3306/wordpress' },
  },
});

const postgres = new PostgresPrisma();

async function fullMigration() {
  // 1. Migrate users
  const wpUsers = await mysql.user.findMany();
  // Transform and insert into postgres

  // 2. Migrate producers
  // ...

  // 3. Migrate statements (with caution)
  // ...

  console.log('Full migration complete');
}
```

---

## Data Validation Checklist

After migration, verify:

- [ ] All writer accounts created
- [ ] Producer profiles linked correctly
- [ ] IPI numbers preserved
- [ ] PRO affiliations correct
- [ ] Test login with migrated user
- [ ] Upload test statement and verify parsing
- [ ] Check income aggregation accuracy
- [ ] Verify opportunities display correctly

---

## Rollback Plan

If migration fails:

1. **Keep WordPress running** during transition period
2. **Run both systems in parallel** for 2-4 weeks
3. **Compare data** between old and new
4. **Gradually phase out WordPress** once confident

---

## Testing Migration

```bash
# 1. Set up test database
DATABASE_URL="postgresql://localhost:5432/producer_tour_test"

# 2. Run migration scripts
npm run migrate:users
npm run migrate:producers

# 3. Verify data
npx prisma studio

# 4. Test API endpoints
curl http://localhost:3000/api/users
```

---

## WordPress Decommission

Once fully migrated and tested:

1. **Backup WordPress** one final time
2. **Archive the database** dump
3. **Save all uploaded files** (statements, images)
4. **Document any custom code** you want to preserve
5. **Redirect old URLs** to new React app
6. **Cancel WordPress hosting** (optional)

---

## Support

For migration assistance:
- Review Prisma docs: https://www.prisma.io/docs
- Check data mapping in `prisma/schema.prisma`
- Test with small datasets first
- Keep backups of everything
