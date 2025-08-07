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

## Database Setup

1. **Create Database**: Set up a PostgreSQL database
2. **Run Migrations**: After deployment, run database migrations:
   ```bash
   npx prisma db push
   ```

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