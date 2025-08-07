# Vercel Deployment Guide

## Prerequisites

1. **Database**: Set up a PostgreSQL database (recommended: Vercel Postgres, Supabase, or Railway)
2. **Environment Variables**: Configure the following environment variables in Vercel

## Environment Variables

Add these environment variables in your Vercel project settings:

### Required Variables

```
DATABASE_URL=postgresql://username:password@host:port/database?connection_limit=10&pool_timeout=30&connect_timeout=30
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.vercel.app
```

**Important**: The DATABASE_URL should include connection pooling parameters for optimal performance on Vercel:

- `connection_limit=10` - Maximum connections per pool
- `pool_timeout=30` - Connection pool timeout in seconds
- `connect_timeout=30` - Connection timeout in seconds

### Optional Variables

```
NEXTAUTH_GITHUB_ID=your-github-oauth-id
NEXTAUTH_GITHUB_SECRET=your-github-oauth-secret
```

## Performance Optimization

### Database Connection Pooling

For optimal performance on Vercel, ensure your DATABASE_URL includes pooling parameters:

```bash
# Example for Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?connection_limit=10&pool_timeout=30&connect_timeout=30

# Example for Railway
DATABASE_URL=postgresql://postgres:[password]@containers-us-west-[id].railway.app:5432/railway?connection_limit=10&pool_timeout=30&connect_timeout=30
```

### Vercel Configuration

Add these settings to your `vercel.json` (create if it doesn't exist):

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]
}
```

## Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Configure Environment Variables**: Add the required environment variables with connection pooling
3. **Deploy**: Vercel will automatically build and deploy your application

## Build Configuration

The project is configured with:

- **Build Command**: `prisma generate && next build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

## Database Setup & Migrations

### Option 1: Using Prisma Migrate (Recommended for Production)

After deployment, run migrations using your existing migration files:

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Link to your Vercel project (first time only)
vercel link

# Pull environment variables from your deployment
vercel env pull .env

# Run migrations (this will apply your migration files)
npx prisma migrate deploy

# Run permission seeding
npm run db:seed
```

### Option 2: Using the Built-in Migration API

Your app includes an admin API endpoint for migrations:

1. **Deploy to Vercel first**
2. **Access the migration endpoint**: `https://your-app.vercel.app/api/admin/migrate`
3. **Run migrations via API**:

```bash
# Check migration status
curl https://your-app.vercel.app/api/admin/migrate

# Run full setup (migrations + seeding)
curl -X POST https://your-app.vercel.app/api/admin/migrate
```

## Performance Monitoring

### Debug Performance Issues

After deployment, you can diagnose performance issues:

1. **Access the debug page**: `https://your-app.vercel.app/debug`
2. **Run performance tests** to identify bottlenecks
3. **Compare dashboard APIs** to see which performs better

### Common Performance Issues

1. **Database Connection Slow**: Update DATABASE_URL with pooling parameters
2. **Cold Starts**: Consider Vercel Pro for better performance
3. **Query Performance**: Use the optimized dashboard API (`/api/dashboard/optimized`)

## Migration File Structure

Your project has these migration files:

```
prisma/migrations/
├── 20250807033743_baseline_with_enhanced_fields/
├── 20250807042330_add_rbac_system/
└── migration_lock.toml
```

These will be automatically applied when you run `prisma migrate deploy`.

## Troubleshooting

### Common Issues

1. **Prisma Client Error**: Ensure `DATABASE_URL` is correctly set with pooling parameters
2. **Build Failures**: Check that all environment variables are configured
3. **Database Connection**: Verify database is accessible from Vercel
4. **Slow Performance**: Use the debug tools at `/debug` to identify bottlenecks

### Environment Variables Check

Make sure these are set in Vercel:

- ✅ `DATABASE_URL` (with connection pooling parameters)
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL`

## Post-Deployment

1. **Database Migration**: Run `npx prisma db push` to apply schema
2. **Seed Data**: Optionally seed initial data
3. **Test Application**: Verify all features work correctly
4. **Performance Test**: Use the debug page to check performance

## Support

For issues with deployment, check:

- Vercel build logs
- Database connection
- Environment variable configuration
- Performance debug tools at `/debug`
