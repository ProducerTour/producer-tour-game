# Backend Integration Tests

This directory contains integration tests for the Producer Tour backend payment workflow.

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `vitest` - Fast unit test framework
- `supertest` - HTTP testing library
- `@vitest/coverage-v8` - Code coverage reporting
- `@vitest/ui` - Visual test UI

### 2. Create Test Database

Create a **separate test database** to avoid affecting your development data:

```sql
CREATE DATABASE producer_tour_test;
```

### 3. Configure Test Environment

Copy the example environment file:

```bash
cp .env.test.example .env.test
```

Update `.env.test` with your test database credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/producer_tour_test"
```

**⚠️ IMPORTANT**: The test database URL **must** contain the word "test" as a safety check!

### 4. Run Migrations on Test Database

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/producer_tour_test" npx prisma migrate deploy
```

Or set up your `.env.test` and run:

```bash
npm run db:migrate
```

## Running Tests

### Run All Tests Once

```bash
npm test
```

### Watch Mode (Re-run on Changes)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Visual UI

```bash
npm run test:ui
```

Then open http://localhost:51204/__vitest__/

## Test Structure

### Integration Tests

**`src/__tests__/payment-workflow.integration.test.ts`**

Comprehensive end-to-end tests for the payment processing workflow:

1. **Complete Payment Workflow** - Tests the full flow from statement upload to payment processing
2. **Edge Cases**:
   - Double payment prevention
   - Admin role requirements
   - Multi-writer splits
   - Commission rate overrides
   - Micro-amount precision
3. **Republish Workflow** - Tests statement republishing with recalculated precision

### Test Coverage

The integration tests cover:

- ✅ Statement upload and parsing
- ✅ Smart writer assignment
- ✅ Writer assignment and split percentages
- ✅ Statement publishing
- ✅ Commission calculations (global and per-writer overrides)
- ✅ Payment summary generation
- ✅ Payment processing
- ✅ Writer visibility controls
- ✅ Database state verification
- ✅ Role-based access control
- ✅ Statement republishing
- ✅ Precision handling for micro-amounts (DECIMAL(12,6))

## Test Data

Tests automatically:
- Create temporary test users (admin and writers)
- Set up commission settings
- Create Producer Tour publisher configurations
- Clean up all test data after tests complete

**No manual data setup required!**

## Debugging Tests

### View Test Output

```bash
npm test -- --reporter=verbose
```

### Run Specific Test File

```bash
npm test payment-workflow
```

### Run Specific Test Suite

```bash
npm test -- -t "Complete Payment Workflow"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/vitest run
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: producer_tour_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/producer_tour_test
      - run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/producer_tour_test
          JWT_SECRET: test-secret
```

## What's Tested vs What's Not

### ✅ Currently Tested

- Full payment workflow (upload → assign → publish → pay)
- Commission calculations
- Split percentages
- Database state transitions
- Visibility controls
- Role-based access
- Precision handling

### ⏳ Not Yet Tested (Future Work)

- Payment provider integration (Stripe, PayPal, Wise)
- Email notifications
- CSV/Excel export generation
- File upload validation
- Concurrent payment processing
- Large dataset performance

## Common Issues

### Issue: "DATABASE_URL must contain 'test'"

**Solution**: Ensure your `.env.test` file has a database URL containing the word "test":

```env
DATABASE_URL="postgresql://user:password@localhost:5432/producer_tour_test"
```

### Issue: Tests fail with "relation does not exist"

**Solution**: Run migrations on your test database:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/producer_tour_test" npx prisma migrate deploy
```

### Issue: Port already in use

**Solution**: The test server runs on port 3001 by default. Update `.env.test` if needed:

```env
PORT=3002
```

## Contributing

When adding new features:

1. Add integration tests for critical workflows
2. Ensure tests clean up after themselves
3. Use descriptive test names
4. Document expected behavior in comments
5. Aim for >80% code coverage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
