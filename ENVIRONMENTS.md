# Environment Configuration

This project uses separate Supabase projects for development and production.

## Projects

### Development (Local)
- **Project Name**: `wandergraff`
- **Project ID**: `hgoszaslrazqafclkvar`
- **Environment File**: `.env.local` (ignored by git)
- **URL**: https://hgoszaslrazqafclkvar.supabase.co

### Production
- **Project Name**: `wandergraff-production`
- **Project ID**: `nsicydcumvqzpaikmhuk`
- **Environment File**: `.env` (committed to git, but with placeholder secrets)
- **URL**: https://nsicydcumvqzpaikmhuk.supabase.co

## How Environment Variables Work

1. **Local Development** (npm run dev):
   - Vite loads `.env.local` first (takes precedence over `.env`)
   - `.env.local` points to the `wandergraff` development project
   - Credentials in `.env.local` are git-ignored

2. **Production** (Deployment):
   - Uses `.env` which points to `wandergraff-production` project
   - Secrets (like `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` password) are set via platform environment variables
   - Never commit actual secrets to git

## Setting Up Locally

The local development is already configured. The `.env.local` file is automatically used when you run `npm run dev`.

## Database Passwords

Both projects need database passwords set in the connection strings. Get them from:

1. Go to Supabase Dashboard → Your Project → Project Settings → Database
2. Look for the "Connection string" section
3. Extract the password and update the respective `.env` file:
   - For local dev: `.env.local` `DATABASE_URL`
   - For production: `.env` `DATABASE_URL`

## Environment Variables

### Public Variables (Frontend)
- `VITE_PUBLIC_SUPABASE_URL` - Supabase project URL
- `VITE_PUBLIC_SUPABASE_ANON_KEY` - Public API key for frontend
- `VITE_PUBLIC_BUILDER_KEY` - Builder.io API key

### Private Variables (Server Only)
- `SUPABASE_URL` - Private Supabase URL
- `SUPABASE_ANON_KEY` - Anon key for server
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for Supabase (never expose to frontend)
- `DATABASE_URL` - PostgreSQL connection string

## Deployment

When deploying to production (e.g., Netlify):
1. Set environment variables in your hosting platform's dashboard
2. Use values from `.env` (the production project)
3. For `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` password, get from the production Supabase project
4. Never commit `.env.local` or actual secrets to git
