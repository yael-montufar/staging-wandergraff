# Project Decisions Log

A record of key architectural, technical, and feature decisions made during development. This document serves as institutional memory for the project's evolution.

---

## Architecture & Database Strategy

### Decision: Local Docker PostgreSQL + Cloud Supabase Auth Hybrid Model
**Date:** Early development phase  
**Status:** ✅ Implemented

**Reasoning:**
- **Local Database:** Using Docker PostgreSQL for local development provides:
  - Full control and transparency over schema
  - Faster iteration cycles without cloud latency
  - No dependency on cloud services during development
  - Cost efficiency (no cloud database charges)
  - Better for team development with Docker Compose setup

- **Cloud Supabase Auth:** Using Supabase OAuth for authentication provides:
  - Pre-built, battle-tested auth infrastructure
  - Google OAuth integration out-of-the-box
  - Separation of concerns (auth != data storage)
  - Scalability path for production

**Trade-offs:**
- Requires managing two systems instead of one
- Need to handle user sync from Supabase → local DB on auth callback

**Implementation Details:**
- Prisma schema defines user/artwork/photo models locally
- Auth callback triggers user creation in local DB via API endpoint (`/api/auth/create-user`)
- Environment: Docker container with docker-compose.yml and devcontainer.json
- Database: PostgreSQL running in local Docker container

---

## Photo Upload & EXIF Data

### Decision: Remove EXIF Data Extraction & Disable Standalone Photo Uploads
**Date:** Mid-development phase  
**Status:** ✅ Implemented

**Initial Plan (Deprecated):**
- Extract GPS coordinates from photo EXIF data
- Allow artwork creation during photo upload workflow
- EXIF data as backup location source if manual pinning wasn't precise

**Revised Decision:**
- **Completely removed EXIF extraction** - No GPS parsing, no metadata handling
- **Require existing artwork ID** - Photos can only be uploaded to already-pinned murals
- **Simplified flow:** Select photo → Preview → Privacy checkbox → Upload
- **No artwork creation** during photo upload

**Reasoning:**
- "Pin first, then upload" workflow is cleaner and more intuitive
- Users already define artwork location/metadata during pinning
- EXIF data is unreliable (many photos lack GPS, privacy concerns)
- Reduces complexity significantly
- Forces good UX pattern: complete artwork metadata before accepting photos

**Flow:**
1. User navigates to `/artwork/register` → pins mural with title, description, location
2. Success page shows "Upload Photo" button with artwork ID
3. User goes to `/artwork/upload?artworkId=XXX` 
4. Selects photo, optionally marks as private, uploads
5. Done - photo associated with existing artwork

**Code Changes:**
- Removed `extractExifData()` calls
- Removed EXIF-related state management
- Removed artwork creation logic from upload action
- Simplified from multi-step "upload → review → confirm" to single upload step
- Loader now requires `artworkId` and redirects to home if missing

---

## Authentication & User Management

### Decision: Client-Side API Call for User Creation in Auth Callback
**Date:** Early development phase  
**Status:** ✅ Implemented

**Problem:**
- Server-side loaders weren't being triggered during fragment-based OAuth callbacks
- Users weren't being created in local DB, causing FK constraint violations
- Error: `Foreign key constraint violated on the constraint: Artwork_createdById_fkey`

**Solution:**
1. Created `/api/auth/create-user.tsx` endpoint to handle user creation
2. Modified `auth.callback.tsx` to make client-side fetch request to this endpoint
3. Payload includes user ID, email, and name from Supabase session

**Key Code:**
```typescript
// In auth.callback.tsx
fetch("/api/auth/create-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: data.session.user.id,
    email: data.session.user.email,
    name: data.session.user.user_metadata?.name || data.session.user.email,
  }),
})
```

**Why This Works:**
- Fragment tokens don't trigger server-side loaders
- Client-side fetch happens after session is established
- Upsert pattern prevents duplicate user errors on re-login

---

## Terminology & User-Facing Language

### Decision: "Pin a Mural" as Core Concept
**Date:** Mid-development phase  
**Status:** ✅ Implemented

**Changes Made:**
- `"Register Artwork"` → `"Pin a Mural"` (more intuitive, actionable)
- `"Sign In to Register"` → `"Sign In to Pin"` (clearer call-to-action)
- `"Registered by"` → `"Pinned by"` (consistent language)
- Button text: "📍 Pin Mural" (emoji + action verb)
- Empty state: "No murals pinned yet" (instead of "No artwork registered")

**Reasoning:**
- "Pin" is shorter and more intuitive than "register"
- Aligns with map metaphor (pinning locations)
- More colloquial and less formal
- Single entity concept (pin = action + result)

**Files Updated:**
- `app/routes/artwork.register.tsx` - Title and button text
- `app/routes/home.tsx` - CTA buttons and empty state
- `app/routes/artwork.$id.tsx` - Attribution text
- All UI messaging and copy

---

## Artwork Ownership & Attribution

### Decision: Hide "Pinned By" Attribution on Artwork Pages
**Date:** Mid-development phase
**Status:** ✅ Implemented

**Reasoning:**
- Anyone can pin artwork to the map, not just the artist
- Displaying "Pinned by [username]" creates false sense of ownership
- True ownership only exists when an artist claims the artwork and receives approval
- Community-driven map means pins are contributions, not claims
- Avoids confusion between "who documented it" (pinner) and "who created it" (artist)

**Trade-offs:**
- Less transparency about who added the entry (but this info still exists in database)
- Users can't see community contributions from other pinners
- May reduce sense of recognition for those who add artworks

**What We Keep:**
- Artist information (when claimed and approved)
- Claim status badge (Unclaimed, Pending Approval, Claimed by Artist)
- Photo galleries (official and community)

**What We Removed:**
- "Pinned by [user name]" text
- Pinning date display

**Rationale:**
The map is a collaborative documentation tool, not a personal portfolio. True ownership comes from artist claims, not from initial pinning. This aligns with the platform's core mission: discovering and celebrating street art, not attributing discovery.

---

## Photo Gallery Structure

### Decision: Separate Official & Community Photo Galleries
**Date:** Mid-development phase
**Status:** ✅ Implemented

**Definitions:**
- **Official Gallery:** Photos curated by the claimed & approved artist
  - Only visible if artwork status is "CLAIMED" (by artist)
  - Only includes photos uploaded by the artist
  - Artist can choose which photos to feature
  - Displays with "Curated by Artist" label

- **Community Gallery:** All user-uploaded photos
  - Always visible (no artist permission needed)
  - Can't be filtered/managed by artist (similar to Google Maps reviews)
  - Always publicly visible
  - Counts displayed separately from official

**Implementation:**
- Photos filtered by `artwork.claimStatus === "CLAIMED"` and `photo.userId === artwork.artist.id`
- Official photos shown first (if any), then community photos
- Featured photo auto-selected: official first, then community
- Sidebar shows count breakdown (e.g., "3 official photos, 12 community photos")

**User Experience:**
- Artists can curate their best work in official gallery
- Community contributions always visible (builds trust, authentic documentation)
- Clear labeling so users know which photos are artist-approved
- No moderation burden in MVP phase (artists don't manage community photos)

**Rationale:**
Inspired by Google Maps business photos model:
- Business owners can add/curate their own photos
- User reviews/photos always visible (not subject to owner approval)
- Keeps documentation authentic and comprehensive
- Artist curation adds credibility without restricting community input

---

## Future: Duplicate Detection Strategy

### Decision: Street-Based Radius for Dedup Detection (Planned)
**Date:** Mid-development phase
**Status:** 📋 Proposed (Not yet implemented)

**Context:**
To prevent duplicate artwork entries, we'll implement a dedup detection algorithm when users pin new murals. This algorithm needs to account for street geography.

**Challenge with Circular Radius:**
- A simple circular radius around coordinates may capture multiple parallel streets
- A wall on Street A is different from the same physical wall's opposite face on Street B (different artwork, different facade)
- Documenting artworks, not physical canvases - same wall, different faces = different artworks

**Proposed Solution:**
- Use a **street-constrained radius** rather than simple circular radius
- Algorithm should detect nearby pins and check:
  1. Geographic proximity (distance threshold)
  2. Street alignment (same street or block)
  3. Visual similarity (compare photo hash/metadata if available)
  4. Manual reviewer approval for borderline cases

**Implementation Considerations:**
- Integrate with street/address geocoding service (Google Maps, Mapbox)
- Store street segment information alongside coordinates
- Flag near-duplicates for manual review rather than auto-merging
- Allow users to merge artworks if they confirm they're the same

**Benefits:**
- Prevents duplicate entries for the same artwork
- Allows legitimate nearby artworks on different streets
- Respects street geography and urban art diversity
- Still enables community contributions without false positives

**Future Work:**
- Research geocoding APIs for street-level accuracy
- Design UI for duplicate detection and merge workflow
- Implement reviewer tools for approval

---

## Development Environment Setup

### Commands & Configuration

**Initial Setup:**
```bash
# Docker environment (provided)
# - devcontainer.json configured with Node.js
# - docker-compose.yml with PostgreSQL service
# - Dockerfile for build/runtime

# Install dependencies
npm install

# Run development server
npm run dev
# Starts on localhost:5173
```

**Database:**
```bash
# Prisma migrations (applied to local Docker PostgreSQL)
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

**Key Environment Variables:**
- `SUPABASE_URL` - Cloud Supabase project URL (auth only)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (for client-side auth)
- `DATABASE_URL` - Local PostgreSQL connection string (Docker container)

**React Router v7 Note:**
- Project uses React Router v7
- Does not export `json` helper from main module
- Use `Response` and `@react-router/node` utilities instead
- `react-leaflet` downgraded to compatible version (v3)

---

## Current Application Features

### Implemented
✅ Google OAuth authentication via Supabase  
✅ User creation in local database  
✅ Pin/register artwork with map location selection  
✅ Artwork metadata (title, description, year created)  
✅ Photo upload to existing artwork  
✅ Photo privacy toggle (public/private)  
✅ Basic routing and authentication gating  
✅ Leaflet map integration for location picking  

### Not Implemented (Out of Scope)
- EXIF data extraction
- Standalone photo upload (requires artwork ID)
- Artwork creation from photo upload
- Advanced search/filtering
- Collections/galleries
- User profiles
- Social features

---

## Known Issues & Resolutions

### Issue: Foreign Key Constraint Error on User Creation
**Resolution:** Implemented API endpoint for user creation with Prisma upsert pattern

### Issue: Multiple Supabase Client Instances Warning
**Console Warning:** "Multiple GoTrueClient instances detected in the same browser context"  
**Status:** Expected behavior in development (not an error)  
**Action:** Monitor for production impact

### Issue: React Leaflet Compatibility
**Resolution:** Downgraded react-leaflet to v3 to match React Router v7 compatibility

---

## Future Considerations

### Possible Enhancements
- [ ] Photo metadata preservation (filename, upload date)
- [ ] Bulk photo upload
- [ ] Image optimization/compression on upload
- [ ] User profile pages showing their pinned murals
- [ ] Search by artist, location, or date
- [ ] Collections/curated galleries
- [ ] Comments/discussions on artwork
- [ ] Reporting/moderation tools

### Production Migration
When moving to production:
1. Decide on database strategy (keep local PG + Supabase, or move to Supabase PG)
2. Set up proper image storage (Supabase Storage, S3, etc.)
3. Configure CORS for production domain
4. Set up CI/CD pipeline
5. Implement analytics/monitoring

---

## Document History

| Version | Date | Key Changes |
|---------|------|-------------|
| 1.0 | Initial | Documented architecture, EXIF removal, terminology, env setup |
| 1.1 | Session 2 | Added attribution removal, street-based dedup detection strategy |
| 1.2 | Session 2 | Added official vs community photo galleries structure |

---

**Last Updated:** [Current Session]  
**Next Review:** When next major decision is made or architecture changes significantly
