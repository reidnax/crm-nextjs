# Vercel Deployment Guide

## Prerequisites

1. **Database**: Set up a PostgreSQL database (recommended: Vercel Postgres, Supabase, or Railway)
2. **Environment Variables**: Configure the following environment variables in Vercel

## Environment Variables

Add these environment variables in your Vercel project settings:

### Required Variables

```
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.vercel.app
```

### Optional Variables

```
NEXTAUTH_GITHUB_ID=your-github-oauth-id
NEXTAUTH_GITHUB_SECRET=your-github-oauth-secret
```

## Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Configure Environment Variables**: Add the required environment variables
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

# Pull environment variables from your deployment
vercel env pull .env.production

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
curl -X POST https://your-app.vercel.app/api/admin/migrate \
  -H "Content-Type: application/json" \
  -d '{"action": "setup"}' \
  -H "Cookie: your-session-cookie"
```

### Option 3: Manual Migration Commands

```bash
# 1. Pull environment variables
npx vercel env pull .env.production

# 2. Apply migration files
npx prisma migrate deploy

# 3. Seed permissions system
npx tsx src/lib/permissions/seed-permissions.ts

# 4. Verify setup
npx prisma studio
```

## Migration Commands Reference

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Apply migration files only |
| `npm run db:seed` | Run permission seeding only |
| `npm run db:setup` | Apply migrations + run seeding |
| `npm run vercel:migrate` | Full Vercel-compatible migration |

## Important: Migration vs Schema Push

### ✅ **Use `prisma migrate deploy` when:**
- You have migration files (which you do)
- You want to track migration history
- You're deploying to production
- You want consistent schema changes

### ❌ **Avoid `prisma db push` when:**
- You have existing migration files
- You're in production
- You want to preserve migration history

## Step-by-Step Production Deployment

### 1. Initial Deployment
```bash
# Push to GitHub
git push origin main

# Vercel will auto-deploy
```

### 2. Database Setup
```bash
# After successful deployment, set up database
vercel env pull .env.production
npm run vercel:migrate
```

### 3. Verify Setup
```bash
# Check if everything is working
curl https://your-app.vercel.app/api/admin/migrate
```

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

1. **Prisma Client Error**: Ensure `DATABASE_URL` is correctly set
2. **Build Failures**: Check that all environment variables are configured
3. **Database Connection**: Verify database is accessible from Vercel

### Environment Variables Check

Make sure these are set in Vercel:

- ✅ `DATABASE_URL`
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL`

## Post-Deployment

1. **Database Migration**: Run `npx prisma db push` to apply schema
2. **Seed Data**: Optionally seed initial data
3. **Test Application**: Verify all features work correctly

## Support

For issues with deployment, check:

- Vercel build logs
- Database connection
- Environment variable configuration
