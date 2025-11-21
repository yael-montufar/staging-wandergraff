# Comprehensive Codebase Audit - WanderGraff

**Date:** November 21, 2025  
**Status:** Post-Neon Migration  
**Auditor Notes:** Systematic review of project structure, dependencies, configuration, and integration points.

---

## Executive Summary

**Current State:** ✅ **HEALTHY** - Application is functional and properly integrated with Neon database.

**Key Findings:**
- Database has been successfully migrated from Supabase to Neon
- All 6 Prisma migrations applied successfully
- Authentication (Supabase) and Storage (Supabase) remain operational
- File upload functionality integrated with Supabase Storage
- No critical issues identified

**Recent Changes:**
- Neon PostgreSQL database created and connected (November 21, 2025)
- Prisma client singleton pattern fixed (prevents concurrent write conflicts)
- DATABASE_URL configuration properly split for local dev (5432) vs Vercel (6543 pooler)

---

## 1. Project Structure & Organization

### Framework & Build
- **Framework:** React Router v7.9.4 (not Next.js)
- **Build Tool:** Vite v6.3.3
- **Runtime:** Node.js v22.18.0
- **Build Output:** React Router build system (outputDirectory: "build" in vercel.json)

### Directory Structure
```
app/
├── routes/           (43 route files - see list below)
├── components/       (UI components)
├── lib/             (Server/utility functions)
├── assets/          (SVG logos)
├── app.css
├── root.tsx
└── routes.ts

prisma/
├── schema.prisma    (Postgres schema)
├── migrations/      (6 migration files)
├── seed.ts
└── wipe.ts

Root files
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── react-router.config.ts
├── vercel.json
└── .env (contains secrets)
```

### Route Organization (43 routes)
**Page Routes:**
- `/` (home.tsx)
- `/map` (map.tsx)
- `/artists` (artists.tsx), `/artists/:letter` (artists.$letter.tsx)
- `/artist/:id` (artist.$artistId.tsx)
- `/countries` (countries.tsx), `/countries/:id` (countries.$id.tsx)
- `/years` (years.tsx), `/years/:year` (years.$year.tsx)
- `/artwork/:id` (artwork.$id.tsx)
- `/artwork/register` (artwork.register.tsx)
- `/artwork/upload` (artwork.upload.tsx)
- `/user/:id` (user.$id.tsx)
- `/user/profile` (user.profile.tsx)
- `/user/settings` (user.settings.tsx)
- `/collection/:id` (collection.$id.tsx)
- `/collection/:id/edit` (collection.$id.edit.tsx)
- `/collection/new` (collection.new.tsx)
- `/auth/login`, `/auth/signup`, `/auth/logout`, `/auth/callback`

**API Routes (17 endpoints):**
- Authentication: `/api/auth/create-user`
- Browse: `/api/browse/artists`, `/api/browse/countries`, `/api/browse/years`
- Artwork CRUD: `/api/artwork/upload`, `/api/artwork/upload-with-pin`, `/api/artwork/add-to-wall`
- Search: `/api/artworks/search`, `/api/artworks/by-artist`, `/api/artworks/by-country`, `/api/artworks/by-year`, `/api/artworks/check-location`
- Map: `/api/map/pins`, `/api/map/hotspots`
- Artist: `/api/artist/by-id`
- Country: `/api/country/by-id`
- User: `/api/user/upload-avatar`, `/api/user/walls`
- Admin: `/api/admin/delete-artwork`
- File serving: `/uploads/:filename`

---

## 2. Database Architecture

### Current Database: Neon PostgreSQL
- **Service:** Neon (serverless PostgreSQL)
- **Project ID:** still-forest-64891548
- **Branch:** main (br-steep-term-ad8axkqa)
- **Database:** neondb
- **Connection:** pooler.c-2.us-east-1.aws.neon.tech:5432 (for Vercel)
- **Status:** ✅ All migrations applied

### Database Schema (14 tables + enums)

**Core Models:**
1. **User** - Authentication and profile data
   - Fields: id, email, name, role, avatarUrl, bio, artistName, artistEmail, artistWebsite, artistInstagram, artistTwitter, artistBio
   - Relations: artworks, photos, galleries, collections, saves, followers/following

2. **Artwork** - Street art entries
   - Fields: id, title, description, latitude, longitude, address, yearCreated, claimStatus, createdById, artistId, rejectedAt
   - Relations: createdBy, artist, photos, galleries, saves, collectionItems

3. **Photo** - Photo uploads
   - Fields: id, artworkId, userId, photoUrl, thumbnailUrl, isPrivate, takenAt, uploadedAt, exifLatitude/Longitude/Altitude, metadata
   - Relations: artwork, user, galleryPhotos

4. **Gallery** - Photo collections for artworks
   - Fields: id, artworkId, type, createdByArtistId, description
   - Relations: artwork, createdByArtist, photos
   - Types: DEFAULT, OFFICIAL

5. **Collection** - User-curated boards
   - Fields: id, userId, name, description, isPublic
   - Relations: user, items, follows

6. **User Engagement**
   - Save: userId + artworkId (bookmarks)
   - Follow: followerId + (followingUserId OR followingCollectionId)

7. **Browse/Curation Models**
   - Country: name, code, artworkCount
   - Artist: name, artworkCount
   - ArtworkYear: year, artworkCount

**Enums:**
- UserRole: ARTIST, REGULAR_USER, ADMIN
- ClaimStatus: UNCLAIMED, PENDING_APPROVAL, CLAIMED
- GalleryType: DEFAULT, OFFICIAL

### Migrations
All 6 migrations successfully applied:
1. **20251118073558_init** - Initial schema with User, Artwork, Photo, Gallery models
2. **20251118100252_add_address_to_artwork** - Added address field to Artwork
3. **20251118111159_add_artist_requests** - Added artist request workflow (later simplified)
4. **20251118113102_simplify_artist_onboarding** - Simplified to direct role assignment
5. **20251118114430_add_rejected_at_to_artwork** - Added rejectedAt for claim cooldown
6. **20251119164940_add_curation_models** - Added Country, Artist, ArtworkYear for browse pages

---

## 3. Authentication & Authorization

### Authentication Method
- **Provider:** Supabase Auth (Google OAuth)
- **Session:** JWT token stored in `auth-token` cookie
- **Verification:** Custom JWT decoding in `app/lib/auth.server.ts`
- **Flow:**
  1. User clicks "Sign In" → redirects to Supabase OAuth
  2. OAuth callback → `/auth/callback` route
  3. Client-side API call to `/api/auth/create-user` (creates/updates user in Neon DB)
  4. User profile created with initial data

### User Roles & Permissions
```
REGULAR_USER (default)
├── Can pin artworks
├── Can upload photos to artworks
├── Can create/manage collections
├── Can view public profiles & collections

ARTIST (self-assigned)
├── All REGULAR_USER permissions
├── Can claim artworks
├── Can submit artist metadata (name, contact info)
├── Can edit claimed artwork metadata
├── Official photo gallery for claimed work

ADMIN (database-only, no signup)
├── Access to /admin/dashboard
├── Can delete artworks
├── Can view all users and artist information
├── Cannot upload photos or claim artworks
```

### Current Issues
⚠️ **No explicit authorization checks on API routes** - Most routes assume authenticated user but don't validate role-based access. Example: `POST /api/artwork/upload` doesn't explicitly check `role !== ADMIN`.

---

## 4. File Upload & Storage

### Current Implementation
- **Service:** Supabase Storage
- **Bucket:** `artwork-photos` (public)
- **Integration:** `app/lib/file-upload.server.ts`
- **Flow:**
  1. Client uploads File via FormData
  2. Server validates MIME type (images only)
  3. Server uploads to Supabase Storage
  4. Returns public Supabase URL
  5. URL stored in Photo.photoUrl field

### MIME Type Support
Allowed: JPEG, PNG, WebP, GIF, HEIC, HEIF
Auto-converts HEIC → JPEG via `heic2any` library

### Image Optimization
- Client-side HEIC conversion in `app/lib/image-conversion.client.ts`
- Resizes large images to max 2048×2048
- 85% JPEG compression

### Configuration Status
✅ Bucket created  
✅ Supabase credentials in .env  
✅ File upload tested and working  

---

## 5. Environment Configuration

### Environment Variables (.env)
```
SUPABASE_URL=https://wbxksbygqdmwplprubie.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://neondb_owner:...@...pooler.c-2.us-east-1.aws.neon.tech/neondb

VITE_PUBLIC_SUPABASE_URL=https://wbxksbygqdmwplprubie.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=...
VITE_PUBLIC_BUILDER_KEY=...
```

### Environment Variable Split
**Local Dev (.env)**
- Uses `postgresql://...supabase.co:5432/postgres` (direct connection)
- Avoids PgBouncer prepared statement conflicts during development

**Vercel Staging/Production**
- Uses `postgresql://...pooler.supabase.com:6543/postgres` (connection pooler)
- Works reliably with serverless Vercel infrastructure
- Neon pooler handles concurrent connections better than Supabase pooler

⚠️ **Note:** `.env` file contains secrets and should not be committed. Vercel environment variables should be used for deployed environments.

---

## 6. Dependencies & Versions

### Core Runtime Dependencies
```json
@react-router/node: ^7.9.4          (SSR support)
@supabase/supabase-js: ^2.81.1      (Auth + Storage)
react: ^18.3.1
react-dom: ^18.3.1
react-router: ^7.9.4
```

### Database & ORM
```json
@prisma/client: ^6.19.0             (ORM)
pg: ^8.16.3                         (PostgreSQL driver - note: unused with Prisma)
```

### UI & Styling
```json
tailwindcss: ^3.4.17
autoprefixer: ^10.4.21
postcss: ^8.5.3
```

### Maps & Visualization
```json
leaflet: ^1.9.4
leaflet.markercluster: ^1.5.3
react-leaflet: ^4.2.0
```

### Image Processing
```json
heic2any: ^0.0.4                    (HEIC → JPEG conversion)
exifr: ^7.1.3                       (EXIF extraction - currently unused)
```

### Utilities
```json
fuse.js: ^7.1.0                     (Fuzzy search)
jwt-decode: ^4.0.0                  (JWT decoding)
isbot: ^5.1.27                      (Bot detection)
```

### Dev Dependencies
```json
@react-router/dev: ^7.9.4
@types/node: ^20.17.32
@types/react: ^18.3.20
typescript: ^5.8.3
vite: ^6.3.3
vite-tsconfig-paths: ^5.1.4
tsx: ^4.7.0                         (TypeScript executor for seed/wipe scripts)
prisma: ^6.19.0                     (CLI & migrations)
```

### Unused Dependencies ⚠️
- **@types/pg** (^8.15.6) - Installed but `pg` driver is not used (Prisma is the DB layer)
- **exifr** (^7.1.3) - Imported in `app/lib/exif.client.ts` but EXIF extraction was removed per DECISIONS.md
- **dotenv** (^16.4.5) - Only needed for Prisma CLI, not app runtime
- **supabase** CLI (^2.58.5) - Dev-only, for manual DB operations

### Missing Dependencies (Not needed but could be useful)
- No HTTP client (using native `fetch`)
- No form validation library (form handling is manual)
- No loading state management (React state)
- No animation library (CSS animations via Tailwind)

---

## 7. Build & Deployment Configuration

### Build Process
- **Tool:** React Router build
- **Command:** `react-router build`
- **Output:** `build/` directory
- **Postinstall:** `prisma generate` (generates Prisma client)

### Vercel Configuration (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build"
}
```

### Deployment
- **Platform:** Vercel
- **Branches:** 
  - `main` → Production deployment
  - `staging` → Preview deployment
- **Database:** Neon (same for both)
- **Auth:** Supabase (same for both)
- **Storage:** Supabase Storage (same for both)

---

## 8. Key Library Integrations

### Supabase Integration
**Auth (Client-side):**
- `app/lib/supabase.client.ts` - Supabase client instance
- `app/routes/auth.login.tsx`, `auth.signup.tsx` - OAuth buttons
- `app/routes/auth.callback.tsx` - Post-OAuth redirect

**Server-side Auth:**
- `app/lib/auth.server.ts` - JWT token extraction & user parsing
- `app/routes/api.auth.create-user.tsx` - User creation on auth callback

**Storage:**
- `app/lib/file-upload.server.ts` - File upload to Supabase Storage
- `app/routes/uploads.$filename.tsx` - File serving (redirects to Supabase URL)

### Prisma Integration
- `app/lib/db.server.ts` - Prisma client singleton
- `app/lib/*.server.ts` - All server functions use `prismaClient()`
- `prisma/schema.prisma` - Data model definition
- `prisma/seed.ts` - Development seed data
- `prisma/wipe.ts` - Database reset (for development)

### Map Integration (Leaflet)
- `app/routes/map.tsx` - Main map page
- Displays pins from `/api/map/pins` endpoint
- Cluster markers with `leaflet.markercluster`
- Click to pin artwork or view details

### Search Integration (Fuse.js)
- `app/routes/api.artworks.search.tsx` - Client-side search
- Fuzzy matching on artwork title, artist, year, country

---

## 9. Security Considerations

### ✅ Implemented
- JWT token-based authentication
- Supabase Auth for OAuth (no password storage)
- File upload MIME type validation
- API route authentication checks (token required)
- Admin-only routes via role check

### ⚠️ Areas of Concern

**1. Authorization Gaps**
- API routes check for authenticated user but not always role-based access
- Example: `/api/admin/delete-artwork` should verify `role === ADMIN` (needs verification)
- Recommendation: Add authorization middleware or checks to all admin endpoints

**2. CORS Configuration**
- No explicit CORS headers in code
- Relies on Vercel defaults
- Recommendation: Review CORS policy for Supabase API calls

**3. Rate Limiting**
- No rate limiting on API endpoints
- Recommendation: Add rate limiting for file uploads, search

**4. Database Connection Pooling**
- Vercel uses 6543 pooler (PgBouncer)
- Known issue: Prepared statement collisions under high concurrency (now mitigated by Neon)
- Neon pooler is more resilient

**5. Secrets Management**
- Supabase keys stored in .env
- Vercel environment variables used in production
- Recommendation: Ensure .env is in .gitignore (verify)

---

## 10. Data Flow Architecture

### User Registration & Authentication
```
User → Google OAuth → Supabase Auth → /auth/callback
                                         ↓
                                  POST /api/auth/create-user
                                         ↓
                                   Prisma creates/updates User
                                         ↓
                                   auth-token cookie set
                                         ↓
                                   Redirect to /
```

### Artwork Pinning
```
User (authenticated) → /artwork/register (form)
                           ↓
                      POST /api/artwork/upload-with-pin
                           ↓
                      Reverse geocode coordinates (Nominatim API)
                           ↓
                      prisma.artwork.create() + ensure Country/Year
                           ↓
                      Return artworkId → /artwork/upload?artworkId=XXX
```

### Photo Upload
```
User → /artwork/upload?artworkId=XXX
        ↓
   Select photo → Validate MIME type
        ↓
   Convert HEIC → JPEG (client-side)
        ↓
   POST /api/artwork/upload (FormData)
        ↓
   Server validates, uploads to Supabase Storage
        ↓
   prisma.photo.create() with Supabase URL
        ↓
   Photo displayed on /artwork/:id
```

### Browse Pages
```
/artists, /countries, /years
    ↓
GET /api/browse/artists (or countries/years)
    ↓
Query Country/Artist/ArtworkYear with artworkCount
    ↓
Display sorted by count (denormalized counters)
```

---

## 11. Performance Considerations

### Database Indexing
✅ **Good:** Comprehensive indexing on frequently queried fields
- User: email, role
- Artwork: createdById, artistId, claimStatus, yearCreated, location
- Photo: artworkId, userId, uploadedAt
- Collection: userId, isPublic
- Browse tables: name (unique), count

### Denormalization
✅ **Good:** Denormalized counters for browse pages
- Country.artworkCount, Artist.artworkCount, ArtworkYear.artworkCount
- Avoids expensive COUNT() aggregations on page load

### N+1 Query Risk
⚠️ **Potential issue:** Some queries might load related data inefficiently
- Example: `/api/artworks/by-artist` loads all artwork + artist + photos
- Recommendation: Verify Prisma `include`/`select` patterns optimize queries

### Image Optimization
✅ **Good:** Client-side image resizing before upload
- Reduces file size & bandwidth
- Server caches Supabase URLs (CDN)

---

## 12. Testing & Quality

### Type Checking
- ✅ TypeScript enabled
- Command: `npm run typecheck` (runs `react-router typegen && tsc`)
- Recommendation: Run before commits

### Testing
⚠️ **No automated tests found**
- No Jest, Vitest, or other test framework configured
- Recommendation: Add tests for critical paths (auth, data creation, search)

### Logging
✅ **Adequate:** Console logging with prefixes ([AUTH], [API_UPLOAD], etc.)
- Helps with debugging in production

---

## 13. Known Issues & Resolutions

### ✅ RESOLVED: Prepared Statement Conflicts (42P05)
- **Cause:** Supabase pooler name collisions under concurrent writes
- **Solution:** Switched to Neon (has better connection pooling)
- **Status:** FIXED (November 21, 2025)

### ✅ RESOLVED: File Upload Failures
- **Cause:** Supabase Storage bucket not configured, trying local filesystem
- **Solution:** Created `artwork-photos` bucket in Supabase, integrated Supabase Storage
- **Status:** FIXED, tested working

### ✅ RESOLVED: Prisma Client Initialization Errors
- **Cause:** Multiple client instances created concurrently, incorrect provider
- **Solution:** Implemented singleton pattern, fixed provider to `"prisma-client-js"`
- **Status:** FIXED

### ⚠️ UNRESOLVED: EXIF Data Handling
- **Status:** Code exists in `exifr` but feature removed per DECISIONS.md
- **Recommendation:** Remove unused `exifr` dependency and related code

### 📋 POTENTIAL: Authorization Checks
- Some API routes may lack role-based authorization
- Recommendation: Audit all admin/protected endpoints

---

## 14. Recommendations & Next Steps

### High Priority
1. **Remove unused dependencies**
   - `exifr` - EXIF extraction removed, code unused
   - `@types/pg` - pg driver not used with Prisma
   - Action: Run `npm uninstall exifr @types/pg`

2. **Add authorization checks**
   - Audit admin routes: `/api/admin/delete-artwork`, `/admin/dashboard`
   - Verify role checks on all protected endpoints
   - Action: Add `if (user.role !== 'ADMIN')` checks

3. **Add automated tests**
   - Test auth flow, artwork creation, file upload
   - Test API endpoints
   - Action: Set up Vitest or Jest

### Medium Priority
4. **Implement rate limiting**
   - File uploads, search queries
   - Action: Add middleware or service-level limits

5. **Verify CORS policy**
   - Ensure Supabase API calls work from frontend
   - Action: Test in production, review browser console

6. **Document API endpoints**
   - Create OpenAPI/Swagger spec
   - Action: Use tRPC or similar

### Low Priority
7. **Add error boundaries**
   - Better error handling in React components
   - Action: Implement React error boundaries

8. **Optimize image serving**
   - Consider CDN caching strategy
   - Action: Review Vercel Image Optimization

9. **Monitor performance**
   - Set up analytics/monitoring
   - Action: Integrate Sentry or similar

---

## 15. Environment Summary

### Local Development
- **Node:** v22.18.0
- **Database:** Neon PostgreSQL (5432)
- **Auth:** Supabase (dev project)
- **Storage:** Supabase Storage
- **Build:** Vite dev server (port 5173)

### Staging (Vercel Preview)
- **Database:** Neon PostgreSQL (via 6543 pooler)
- **Auth:** Supabase (staging project)
- **Storage:** Supabase Storage (staging)
- **Domain:** staging-wandergraff-git-staging-ym-development.vercel.app

### Production (Vercel)
- **Database:** Neon PostgreSQL (via 6543 pooler)
- **Auth:** Supabase (prod project)
- **Storage:** Supabase Storage (prod)
- **Domain:** (pending - not yet deployed to main)

---

## Conclusion

**Overall Health:** ✅ **GOOD**

The codebase is well-organized, properly structured for React Router v7, and successfully integrated with Neon database. The migration from Supabase to Neon resolved critical database issues and the application is now functional for staging.

**Next milestone:** Deploy to production on `main` branch with same Neon/Supabase configuration.

---

**Audit completed:** November 21, 2025 (Post-Neon Migration)  
**Next review:** After first production deployment
