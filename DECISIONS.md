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

## Mobile Image Format Handling

### Decision: Client-Side Conversion of HEIC/Mobile Formats
**Date:** Development phase
**Status:** ✅ Implemented

**Problem:**
- iPhone users upload HEIC format images (Apple's proprietary format)
- Browsers don't natively display HEIC
- Shows as broken image links
- Need to support mobile users without friction

**Solution: Client-Side Conversion**
- Use `heic2any` library to convert HEIC → JPEG in browser
- Also optimize images: compress, resize, handle EXIF orientation
- Happens instantly before upload (better UX than server conversion)
- Works offline, no server load

**Supported Conversions:**
- HEIC/HEIF (iPhone) → JPEG
- Large images → downsampled to max 2048×2048
- Automatic aspect ratio preservation
- Quality: 85% JPEG compression (good balance)

**How It Works:**
1. User selects HEIC image from iPhone
2. `handleFileSelect` calls `convertMobileImage()`
3. Library converts HEIC to JPEG blob
4. Canvas optimization: resize, compress, handle orientation
5. Result: properly formatted JPEG file
6. Preview shown, then uploaded as normal

**Benefits:**
- ✅ iPhone users can upload directly (no manual conversion)
- �� Smaller file sizes (optimized on client)
- ✅ Faster uploads
- ✅ Works offline
- ✅ Better UX than server-side conversion

**Android Considerations:**
- Most Android phones output JPEG/H.264 natively
- Some older devices might have issues - Canvas optimization handles this
- Image size optimization benefits all mobile devices
- EXIF orientation is mostly auto-corrected by modern phones

**Technical Details:**
- File: `app/lib/image-conversion.client.ts`
- Library: `heic2any` (npm package)
- Canvas operations: resize, quality reduction, orientation
- Format detection: checks MIME type and filename extension

**Limitations:**
- Requires JavaScript (all users have this)
- Client-side processing is slower for very large files (but we resize to 2048px)
- Older browsers might not have Canvas support (acceptable for MVP)

**Future Enhancements:**
- Add full EXIF orientation handling with `piexifjs`
- Support animated HEIC files
- Add image cropping/rotation UI
- Implement progressive JPEG for faster preview

---

## Image Storage Strategy

### Decision: Local File System Storage for Development
**Date:** Development phase
**Status:** ✅ Implemented

**Approach:**
- Store uploaded images on local disk (`/public/uploads`)
- Create a static file serving route (`/uploads/:filename`)
- Store file paths in database instead of base64 data URLs
- Generate unique filenames with timestamps and random IDs

**Why Not Base64?**
- Base64 increases database size significantly
- Slower queries with large data URLs embedded
- Memory inefficient
- Better to store files separately and reference them

**Why Not Supabase Storage Yet?**
- Development/MVP phase doesn't need cloud infrastructure
- Docker container provides sufficient storage
- No external dependencies or costs during development
- Easy to migrate to Supabase Storage later (just change `saveUploadedFile` function)

**How It Works:**
1. User selects file in upload form
2. Client sends actual File object via FormData (not base64)
3. Server receives file via `saveUploadedFile()`
4. File saved to `/public/uploads/` with unique name
5. Public URL stored in database (e.g., `/uploads/1234567890-abc123def.jpg`)
6. Static route `uploads.$filename.tsx` serves files with proper headers

**Implementation Details:**
- File: `app/lib/file-upload.server.ts` - handles file I/O
- Route: `app/routes/uploads.$filename.tsx` - serves uploaded files
- Form: Changed from sending base64 to sending actual File object
- Action: Updated to call `saveUploadedFile()` instead of storing data URL

**Security Considerations:**
- Filename validation (unique IDs prevent collisions)
- Path traversal protection (filepath must be within `/public/uploads`)
- No execution allowed in uploads directory
- Cache headers set for long-term storage

**Future Migration Path:**
To move to Supabase Storage (production):
1. Create new function `saveUploadedFileToSupabase()`
2. Update action to call new function
3. Return Supabase public URL instead of local path
4. Everything else stays the same (database structure, display code)

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

### Issue: Prisma Client Generation Failure - Module Resolution Error
**Date:** Session 11
**Status:** ✅ **RESOLVED**

**Problem:**
- `npm run db:wipe` was failing with `PrismaClientInitializationError: Cannot find module '.prisma/client/default'`
- This prevented database operations and seeding
- Root causes identified:
  1. Conflicting `./generated/` folder in project root containing old Prisma client
  2. Generator provider was `"prisma-client"` (incorrect) instead of `"prisma-client-js"`
  3. Old generated client was preventing proper module resolution

**Solution Applied:**
1. **Fixed `prisma/schema.prisma`:**
   - Changed `provider = "prisma-client"` → `provider = "prisma-client-js"`
   - Removed incorrect `output = "../.prisma/client"` path (uses Prisma default)

2. **Cleaned Up Conflicting Files:**
   - Deleted entire `./generated/` directory
   - This old folder was interfering with npm's module resolution

3. **Regenerated Prisma Client:**
   - Ran `npm install` which triggered `postinstall` script
   - Generated proper client files to `node_modules/@prisma/client`
   - Now creates both JS and TS files correctly

**Verification:**
```bash
✅ npm install succeeded with proper Prisma generation
✅ npm run db:wipe executed successfully
✅ Database operations now functional
```

**Key Learning:**
The `"prisma-client"` provider only generates TypeScript files, while `"prisma-client-js"` (the correct provider) generates both TypeScript and JavaScript files that Node.js needs for module resolution.

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
| 1.3 | Session 2 | Added local file storage strategy for images |
| 1.4 | Session 2 | Added mobile image format conversion (HEIC→JPEG, optimization) |

---

## User Profile System Architecture

### Decision: Private Dashboard vs Public Profile Separation
**Date:** User profiles implementation phase
**Status:** ✅ Implemented

**Reasoning:**
- Users need a way to manage their content (private photos, collections)
- Other users should be able to discover and view public content from users
- Different UX requirements for owner vs viewer perspectives

**Architecture:**
- **Private Dashboard** (`/user/profile`):
  - Accessible only to authenticated user
  - Shows all photos (private and public) with toggle switches
  - Allows photo deletion and privacy management
  - Shows all collections (public and private)
  - Allows collection creation, editing, deletion
  - Lists owned artworks for artists

- **Public Profile** (`/user/:userId`):
  - Accessible to all users
  - Shows only public collections
  - Shows only public photos
  - Shows all claimed artworks (for artists)
  - Links to user profile from photos and collections

**Implementation Details:**
- Dashboard uses `getPhotosByUser()` (returns all photos)
- Public profile uses filtered queries for public content only
- Photos include user info via `include: { user: true }`
- Collections use `getCollection()` with user relationship
- Navigation updated to link user name/avatar to their profile

**Security:**
- Dashboard route checks auth token and redirects to login if missing
- Public profile route allows anonymous access
- Collections check `isOwner` before allowing edit/delete actions
- Photos only deletable by uploader or collection owner

---

## Collections as User-Curated Boards

### Decision: Collections as Separate Entity from Galleries
**Date:** User profiles implementation phase
**Status:** ✅ Implemented

**Terminology Clarification:**
- **Gallery**: Photo grouping for a specific artwork
  - Official Gallery: Artist-curated photos for their claimed artwork
  - Community Gallery: All public photos uploaded for an artwork

- **Collection**: User-curated board of multiple artworks (like Pinterest)
  - Can be public or private
  - User can add/remove artworks
  - Owned by user, not artwork

**Data Model:**
```
User -> Collection (one-to-many)
Collection -> CollectionItem -> Artwork (many-to-many)
Collection -> Follow (for phase 2 social features)
```

**Collection Features:**
- Create new collections with name, description, visibility
- Add/remove artworks from collections
- Edit collection details (name, description, public/private toggle)
- Delete collections
- Public collections discoverable by other users
- Public collections viewable by anyone via /collection/:id

**Implementation Details:**
- Collections library has full CRUD operations
- Routes: /collection/new, /collection/:id, /collection/:id/edit
- Collections include full artwork details with primary photo
- Owner-only operations protected via user ID checks

**Rationale:**
Separates artwork-specific photo groupings (galleries) from user-curated collections. Collections serve as a way for users to organize discoveries and share themed groups of artworks with others.

---

## Photo Attribution System

### Decision: Link Community Photos to Uploader
**Date:** User profiles implementation phase
**Status:** ✅ Implemented

**Problem:**
- Community photos lacked attribution to the uploader
- No way to see a user's contributions across artworks
- Users had no incentive to contribute or get recognition

**Solution:**
- Every photo includes user relationship (user_id field already in schema)
- Artwork detail page displays uploader name and link to their profile
- Uploader names shown in both official and community galleries
- Photos display upload date
- Users can click uploader name to visit their public profile

**Implementation Details:**
- `getPhotosByArtwork()` includes user relationship via `include: { user: true }`
- Artwork page displays: "Uploaded by [username] on [date]"
- Username is a link to `/user/:userId` public profile
- Works for both official and community photos
- Private photos still show uploader attribution on artwork detail (if user is viewing)

**Benefits:**
- Recognition for photo contributors
- Discoverable contributor profiles
- Builds sense of community contribution
- Users can develop reputation as photographers/documenters

---

## User Role System Integration

### Decision: Keep Artist/Regular User Distinction in Public Profiles
**Date:** User profiles implementation phase
**Status:** ✅ Implemented

**Reasoning:**
- Artists need to claim and curate their work
- Regular users contribute photos and collections
- Profiles should visually distinguish between users with claimed artworks vs just contributors

**Implementation:**
- User role already in schema: `role: UserRole (ARTIST | REGULAR_USER | ADMIN)`
- Public profile displays "Artist" badge if user.role === "ARTIST"
- Artist profiles show their claimed artworks in dedicated section
- Artist profiles show contribution counts
- All profiles show:
  - Number of photos contributed
  - Number of public collections
  - Artists additionally show: number of claimed artworks

**Benefits:**
- Helps users find artists they want to follow
- Artists gain recognition for their work
- Clear distinction between discovery paths (artist portfolios vs curator collections)

---

## Dashboard Features for Content Management

### Decision: Photo Privacy Toggle and Deletion in Dashboard
**Date:** User profiles implementation phase
**Status:** ✅ Implemented

**Problem:**
- Users uploaded photos with "keep private" checkbox but couldn't access them later
- No UI for managing photo visibility
- No way to delete unwanted photos

**Solution:**
Dashboard provides:
1. **Photo Visibility Management**
   - Private photos section with "Make Public" button
   - Public photos section with "Make Private" button
   - Color-coded: yellow indicator for private, green for public
   - Toggle action via form submission

2. **Photo Deletion**
   - Delete button on every photo card
   - Confirmation via native browser confirm()
   - Removes photo from all galleries

3. **Collection Management**
   - View all owned collections
   - Create new collection
   - View collection details
   - Edit collection (name, description, visibility)
   - Delete collection (with confirmation)

4. **Visual Organization**
   - Tab navigation for Photos vs Collections
   - Grid layout showing thumbnails
   - Display upload/creation dates
   - Show associated artwork title

**Implementation Details:**
- Dashboard form actions handle: toggle-privacy, delete-photo, delete-collection
- Uses POST method with hidden _action field
- getPhotosByUser() returns all photos regardless of privacy
- Photos filtered on client for display (private vs public sections)
- Collection count and item count displayed

**Rationale:**
Users need full control over their content. Dashboard provides single place to manage photos (privacy, deletion) and collections (CRUD) without leaving the platform.

---

## Simplified Artwork Pinning Flow

### Decision: Location-Only Pinning with Automatic Address Display
**Date:** Session 4
**Status:** ✅ Implemented

**Problem:**
- Previous flow required users to provide Title, Year, and Description when pinning
- This metadata should come from the actual artist who claims the work
- Community members don't have accurate information about artworks
- Form was intimidating with 4+ required fields

**Solution:**
- **Simplified Form:** Users only click map to select location
- **Automatic Address:** Reverse geocoding shows street address instead of coordinates
- **Placeholder Title:** System creates "Untitled | [Address]" placeholder
- **Artist Editing:** When artist claims artwork, they provide actual Title/Year/Description

**Implementation Details:**
- Added `address` field to Artwork schema (stores geocoded address)
- Created `geocoding.server.ts` with Nominatim reverse geocoding
- Modified `createArtwork()` to accept optional address and generate placeholder title
- Updated `/artwork/register` form to remove Title/Year/Description inputs
- Client-side geocoding shows address while user selects location

**Deduplication with Address Detection:**
- Added `findDuplicateArtworkNearby()` function (20m radius proximity check)
- When pinning, system checks for existing nearby artworks
- If found, shows modal with preview of nearby artwork
- User can choose to: View the existing one, Cancel, or Create new
- Prevents accidental duplicate pins on same block/street

**Benefits:**
- ✅ Lower friction for community members to contribute locations
- ✅ Addresses are human-readable and useful (vs raw coordinates)
- ✅ Prevents duplicate pins with friendly warning
- ✅ Artists maintain control over actual metadata
- ✅ System has accurate locations + addresses for all artworks

**Geocoding Service:**
- Using OpenStreetMap Nominatim (free, no API key)
- Works offline in development
- Integrates well with Leaflet
- Provides street-level accuracy

**Data Model:**
```
Artwork {
  latitude: Float (original coordinates)
  longitude: Float (original coordinates)
  address: String? (geocoded address like "123 Main St, Los Angeles")
  title: String (auto-generated placeholder until artist claims)
  description: String? (empty until artist claims)
  yearCreated: Int? (empty until artist claims)
}
```

---

## Admin Role & Pin Management

### Decision: Admin Superuser Role (Separate from Artist/Regular User)
**Date:** Session 4
**Status:** ✅ Implemented

**Problem:**
- Need moderation capability to remove incorrectly pinned artworks
- Users shouldn't have ability to delete their own pins (prevents regret cleanup)
- Admin tools shouldn't mix with regular user UI (users shouldn't see hidden delete buttons)

**Solution:**
- **Separate Admin Role:** `UserRole.ADMIN` is a superuser role, distinct from `REGULAR_USER` and `ARTIST`
- **Admin-Only Creation:** Admins can ONLY be created/set directly in database (no frontend signup)
- **Admin Restrictions:** Admins cannot:
  - Upload photos
  - Create collections
  - Claim artworks
  - Have public profiles
  - Participate as regular users

**Admin Dashboard (`/admin/dashboard`):**
- Separate, dedicated interface (no user dashboard features)
- Grid of all artworks with:
  - Search by title/address
  - Filter by claim status (Unclaimed, Pending Approval, Claimed)
  - Photo preview of each artwork
  - Delete button for each pin
  - Confirmation modal before deletion
- Pagination for browsing large datasets
- No ability to edit artwork metadata (only delete)

**Authentication:**
- Route gating: `/admin/dashboard` redirects non-admins to home
- Navigation: Dashboard link routes to `/admin/dashboard` for ADMIN role, `/user/profile` for others

**User Dashboard Enhancements:**
- Photos organized by privacy status (Private/Public)
- Nested grouping: Each status → Grouped by Artwork → Photos
- Unlinked photos shown separately in "Not linked to artwork" section
- Organization prevents scattered list of images

**Data Model:**
```
User {
  role: REGULAR_USER | ARTIST | ADMIN
}

Artwork {
  // When admin deletes an artwork:
  // - Photos are orphaned (artworkId set to null)
  // - Collection items are deleted
  // - Saves are deleted
  // - Galleries are deleted
  // - Artwork is deleted
}
```

**Rationale:**
- Strict separation keeps interface clean (no hidden features)
- Dedicated admin dashboard prevents accidental user interaction with moderation tools
- Orphaning photos instead of cascading delete preserves user content
- Users requesting pin removal provides feedback loop (why did someone pin incorrectly?)

---

## Artist Claim System

### Decision: Artist Claim System with Visibility & Rate Limiting
**Date:** Session 5-6
**Status:** ✅ Implemented

**Problem:**
- Need to establish true artwork ownership separate from who pinned/documented it
- Artists need to claim artworks they created to establish credibility
- Admins need to verify claims (outside platform scope - direct communication)
- Multiple artists could claim the same artwork (admin must choose true artist)
- System needs to prevent spam claims and allow cooldown periods

**Solution: Three-Stage Claim Status with Visibility Control**

**Three Claim Statuses:**
1. **UNCLAIMED** (default)
   - Anyone can view the artwork
   - "Claim This Artwork" button visible for ARTIST-role users
   - Title is placeholder ("Untitled | [Address]")

2. **PENDING_APPROVAL** (artist claimed, awaiting admin review)
   - **Only the artist who made the claim sees this status**
   - Other visitors see "Unclaimed" instead
   - Claim maker sees: "Claim Pending Admin Review", pending count (X/3), "Withdraw Claim" button
   - Claim maker cannot edit metadata yet
   - Admin sees claim in dashboard for verification (outside platform - direct communication)

3. **CLAIMED** (admin approved)
   - Everyone sees "Claimed by Artist"
   - Artist is officially credited with name displayed
   - Artist can edit: title, year created, description
   - Official Gallery accessible (artist's curated photos)

**Visibility Rules:**
- **For the claim maker**: Sees "Pending Approval" badge, pending count (X/3), withdraw option
- **For everyone else**: See "Unclaimed" until admin approves
- **After approval**: Everyone sees "Claimed by Artist"

**Claim Rate Limiting:**
- **Maximum 3 open/pending claims per artist at any time**
- Only applies to PENDING_APPROVAL status, not CLAIMED
- Artists can "Withdraw Claim" to free up a slot for another artwork
- Unlimited CLAIMED artworks (no limit on approved claims)

**Rejection & Cooldown:**
- When admin rejects a claim, artwork returns to UNCLAIMED
- Artist cannot re-claim the same artwork for **2 weeks** (cooldown period)
- After 2 weeks, artist can re-submit claim (like YouTube copyright strikes)
- Cooldown is per-artwork per-artist (tracked by rejectedAt timestamp)

**Withdraw Claim Feature:**
- Artists can withdraw their pending claim anytime via "Withdraw Claim" button
- Returns artwork to UNCLAIMED status
- Frees up a claim slot immediately (no penalty)
- No cooldown triggered by voluntary withdrawal

**Metadata Editing Post-Claim:**
- After CLAIMED status, artist can edit:
  - **Title**: Proper name of the artwork
  - **Year Created**: Year the artwork was completed (not pinning date, not photo upload date)
  - **Description**: Artist statement, techniques, materials, etc.
- Placeholder title no longer applies

**Data Model:**
```
Artwork {
  claimStatus: UNCLAIMED | PENDING_APPROVAL | CLAIMED
  artistId: String? (artist who made the claim)
  rejectedAt: DateTime? (timestamp when claim was last rejected, for cooldown enforcement)
  title: String (placeholder until artist claims and provides real title)
  yearCreated: Int? (empty until artist provides)
  description: String? (empty until artist provides)
}

User {
  role: REGULAR_USER | ARTIST | ADMIN
  // Direct role assignment, no approval needed for artist status
}
```

**Error Messages for Artists:**
- "You already have 3 pending claims. Complete or withdraw one to make another claim."
- "This artwork was recently rejected. Please wait 2 weeks before re-submitting your claim."

**Benefits:**
- ✅ Clear workflow for artist verification with multiple claim handling
- ✅ Prevents spam with 3-pending limit
- ✅ Cooldown prevents immediate re-submission after rejection
- ✅ Privacy: Non-claimers don't see pending claims until approved
- ✅ Separates documentation (pinner) from creation (artist)
- ✅ Gives artists control over their own metadata
- ✅ Admins have flexibility in verification approach
- ✅ Reversible process (withdraw claim or wait for cooldown)

---

### Decision: Simplified Artist Onboarding (No Approval Required)
**Date:** Session 5-6
**Status:** ✅ Implemented

**Problem with Previous Approach:**
- Requiring admin approval for users to become artists created unnecessary friction
- Platform references (Twitter verification, Spotify artist accounts, YouTube creator status) don't require blanket approval
- Only artwork *claims* need verification, not artist role assignment
- Users should be able to self-declare as artists immediately

**Solution:**
- **Direct Artist Role Assignment**: Users can toggle to ARTIST role immediately from user profile
- **Contact Information Collection**: When becoming an artist, users provide optional contact info:
  - Artist Name (different from account name if desired)
  - Contact Email
  - Instagram Handle
  - Twitter Handle
  - Website/Portfolio URL
  - Bio
- **Admin Communication**: Admins view all registered artists in dashboard with their contact info
- **Direct Outreach**: When approving claims, admins reach out directly to artists via provided contact info
- **No Approval Process for Role**: Role change is instant, no admin approval needed

**Workflow:**
1. Regular user visits `/user/profile`
2. If `role: REGULAR_USER`, shows "Become an Artist" button
3. User clicks → modal form with optional contact fields
4. User provides any/all contact info they're comfortable sharing
5. Submits → role immediately changed to ARTIST
6. Artist profile section appears showing their contact info
7. Artist can edit their contact info anytime via "Edit Artist Info" button

**Admin Dashboard:**
- Registered Artists section shows all users with `role: ARTIST`
- Displays: Artist name, contact email, Instagram, Twitter, website, bio
- Contact links are clickable (email, social media URLs)
- Used for direct outreach when claim decisions are needed

**Verification Model:**
- **Artist Role**: No verification needed, self-declaration
- **Artwork Claims**: Require admin approval (separate process)
- **Admin Verification**: Happens via direct communication (email/DMs/socials)
- **Claim Denial & Re-submission**: Like YouTube copyright strikes:
  - Admins can deny a claim, artwork returns to UNCLAIMED
  - Artist can re-submit claim after addressing concerns (no cooldown period yet)

**Benefits:**
- ✅ No friction for users becoming artists
- ✅ Aligns with how other platforms handle creator/artist status
- ✅ Direct communication preferred for verification
- ✅ Contact info optional but encouraged (artists can add later)
- ✅ Simple, clear separation: artist role ≠ claim verification
- ✅ Flexible re-submission for denied claims

**Data Model:**
```
User {
  role: REGULAR_USER | ARTIST | ADMIN
  artistName: String?      // Different from account name if desired
  artistEmail: String?     // For admin outreach
  artistInstagram: String? // Handle without @
  artistTwitter: String?   // Handle without @
  artistWebsite: String?   // Full URL
  artistBio: String?       // About the artist
}
```

**No Longer Needed:**
- ~~ArtistRequest model~~ (removed from schema)
- ~~Artist request approval/rejection flow~~ (removed from admin dashboard)
- ~~Approval notification system~~ (direct communication instead)

---

## Artwork Registration Flow - Future Refinement

### Decision: Require Reference Image for Pin Registration
**Date:** Session 10
**Status:** 📋 Proposed (Not yet implemented)

**Problem:**
- Current flow: Users pin on map with location only (no verification)
- Risk: Anyone can pin duplicate artworks at same location without reference image
- Need mechanism to identify if proposed pin is unique or duplicate
- Without reference image, impossible to verify if pin represents actual artwork or spam

**Proposed Solution:**
- **Require Photo Upload**: To register a pin, user must upload a reference photo of the artwork
- **Use Map-Pin Coordinates**: When pinning on map and clicking "pin artwork", automatically use that pin's coordinates (no manual entry needed)
- **Photo Purpose**: Verify artwork exists at that location and is unique
- **Prevents Duplicates**: Photo comparison (hash or manual review) can identify duplicate pins on same artwork

**Implementation Strategy:**
1. User pins location on map
2. User clicks "pin artwork" (or equivalent action)
3. System opens registration flow with coordinates pre-filled from pin
4. User must upload photo before registering
5. System checks photo against existing artworks at that location
6. If duplicate suspected: show preview of existing artwork, let user confirm or cancel
7. If unique: register new pin with photo as reference

**Benefits:**
- ✅ Prevents spam/duplicate pins without evidence
- ✅ Provides proof artwork exists at location
- ✅ Simplifies deduplication (can compare photos)
- ✅ Maintains map integrity by requiring verification
- ✅ Still enables quick community pinning (one photo required)

**Trade-offs:**
- Requires more effort from user (upload photo vs. location only)
- Mobile users need camera access or uploaded photo
- May reduce contribution rate (friction increase)

**Related Decisions:**
- See "Simplified Artwork Pinning Flow" - current coordinates-only pinning
- See "Mobile Image Format Handling" - photo upload already optimized

---

### Decision: Future Verification System (Deferred)
**Date:** Session 10
**Status:** 📋 Proposed (Architecture planning phase)

**Context:**
Artwork registration currently relies on community pinning with minimal verification. As platform grows, need systematic approach to verify artworks are real and accurately documented.

**Proposed Verification Approaches (To Evaluate Later):**

**Option A: Photo-Based Verification**
- Similar to ID verification apps (e.g., Onfido, Jumio)
- User takes fresh photo of artwork at location
- Photo geolocation metadata (if available) confirms location
- Platform stores timestamp/location with photo
- Community members can submit additional verification photos
- Verification points system: artworks with more verification photos score higher

**Option B: Location-Based Verification**
- Require user to be physically at artwork location when pinning
- Enable geofencing: "You must be within 10m of pin location to register"
- Mobile-only constraint: desktop users can't pin (must be on-site)
- Prevents remote duplicate pinning
- Stronger guarantee of authenticity but significantly reduces contribution rate

**Option C: Hybrid Approach**
- Desktop users: Upload reference photo + metadata
- Mobile users: Option to use camera (live geolocation + photo)
- Progressive enhancement: more verification data = higher trust score
- Artworks ranked by verification confidence

**Key Questions to Answer Before Implementation:**
1. What level of verification is needed? (MVP can be minimal)
2. How to handle edge cases? (street art removed, altered, covered)
3. Should verification affect visibility? (unverified artworks still visible?)
4. Community vs. expert verification? (crowdsourced or curator review?)
5. Re-verification when artwork changes? (annual checks, user submissions)

**Potential Challenges:**
- **Privacy**: Storing location + photo + timestamp = user tracking data
- **Scalability**: Photo verification (AI or manual) is resource-intensive
- **False Negatives**: Legitimate artworks may fail due to lighting/angle/vandalism
- **User Friction**: Stricter verification = fewer contributions
- **Liability**: If we verify, are we responsible for accuracy?

**Not Yet Decided:**
- Which verification approach fits Wandergraff's vision
- Timeline for implementation
- Whether verification affects artist claim approval process
- How to handle verified vs. unverified artworks in discovery

**Related Decisions:**
- See "Artwork Registration Flow - Require Reference Image"
- See "Admin Role & Pin Management" - admins currently delete bad pins

---

## Future Work & Planned Features

### Phase 2 Onboarding & Claims
- ✅ Claim button implementation on artwork detail page
- ✅ PENDING_APPROVAL to CLAIMED flow (admin dashboard)
- ⏳ Separate artist onboarding flow (request → admin approval → ARTIST role)
- ⏳ Metadata editing for claimed artworks (title, year, description)

### Phase 2+ Features
- [ ] Artist portfolios (claimed artworks gallery)
- [ ] Artist verification badges (multiple levels)
- [ ] Claim proof submission (optional proof documents)
- [ ] Artist statistics (total artworks, reach, impact)
- [ ] Collection following (follow artists, follow collections)
- [ ] Artist messaging (direct communication on platform)
- [ ] Artwork registration flow refinement (required reference photo)
- [ ] Verification system (photo-based, location-based, or hybrid approach)

---

## Database Migration to Neon

### Decision: Switch from Supabase PostgreSQL to Neon Serverless PostgreSQL
**Date:** Session 11 (November 21, 2025)
**Status:** ✅ Implemented

**Problem:**
- Supabase connection pooler (port 6543) caused "prepared statement already exists" (42P05) errors under concurrent database writes
- PgBouncer pooling algorithm reused statement names across connections, causing collisions
- This prevented file uploads and artwork creation in production

**Solution:**
- Migrated to Neon serverless PostgreSQL
- Project ID: `still-forest-64891548`
- Neon's pooler handles concurrent connections better than PgBouncer
- All 6 Prisma migrations successfully applied

**Configuration:**
- **Local Dev:** Uses direct connection (port 5432) via `.env`
- **Vercel Staging/Production:** Uses Neon's pooler (port 5432) - works reliably with serverless
- Connection string stored in Vercel environment variables

**Database Connection Split:**
The prepared statement issue revealed a critical insight: different deployments need different connection strategies:
- **Local development** benefits from direct Postgres connections (avoids pooler overhead)
- **Serverless environments** (Vercel) benefit from connection pooling (manages concurrent Lambda executions)
- **Supabase pooler** was the problem child - not optimized for concurrent writes
- **Neon pooler** is specifically designed for this pattern and works reliably

**Trade-offs:**
- Lost some Supabase-specific features (auth is still Supabase, but DB is now separate)
- Need to manage two separate services (Supabase for auth/storage, Neon for database)
- Small cost difference (but Neon is generally cheaper)

**Benefits:**
- ✅ Reliable concurrent writes without connection pooling errors
- ✅ Better Vercel integration (designed for serverless)
- ✅ Faster query performance in serverless environment
- ✅ No more prepared statement collisions

---

## Codebase Cleanup (Session 11)

### Decision: Remove Unused EXIF Dependencies and Code
**Date:** Session 11 (November 21, 2025)
**Status:** ✅ Completed

**What Was Removed:**
1. **Dependency:** `exifr` library (no longer used)
   - Per DECISIONS.md, EXIF extraction feature was removed
   - `createPhotoPreview()` was the only function still in use (reads file as data URL, doesn't need exifr)

2. **Code:** `app/lib/exif.client.ts` file
   - Moved `createPhotoPreview()` to `app/lib/image-conversion.client.ts`
   - Updated imports in:
     - `app/components/PhotoUploadForm.tsx`
     - `app/routes/artwork.upload.tsx`

3. **Dependency:** `@types/pg` (unused)
   - Installed for raw PostgreSQL driver, but Prisma is the DB layer
   - No code uses the raw `pg` driver

**Database Schema:**
- Left `exifLatitude`, `exifLongitude`, `exifAltitude` columns in Photo model
- These exist in database but are never populated (backward compatible)
- No migration needed - fields simply remain null

**Results:**
- 2 unused dependencies removed
- 1 unused file removed
- No breaking changes
- All imports updated and verified

---

## Document History

| Version | Date | Key Changes |
|---------|------|-------------|
| 1.0 | Initial | Documented architecture, EXIF removal, terminology, env setup |
| 1.1 | Session 2 | Added attribution removal, street-based dedup detection strategy |
| 1.2 | Session 2 | Added official vs community photo galleries structure |
| 1.3 | Session 2 | Added local file storage strategy for images |
| 1.4 | Session 2 | Added mobile image format conversion (HEIC→JPEG, optimization) |
| 1.5 | Session 3 | Added user profile system: dashboard, public profiles, collections, attribution |
| 1.6 | Session 4 | Simplified pinning to location-only with auto-geocoding and dedup detection |
| 1.7 | Session 4 | Added admin superuser role, pin management/deletion, enhanced user dashboard with photo nesting |
| 1.8 | Session 4 | Admin auto-redirect, logout UI, documented future: artist onboarding & claim approvals |
| 1.9 | Session 5 | Finalized artist claim flow with PENDING_APPROVAL → CLAIMED workflow, claim button logic, metadata editing, proposed separate artist onboarding |
| 2.0 | Session 6 | Simplified artist onboarding: removed approval requirement, added direct role assignment with contact info collection, updated admin dashboard to show artists directory |
| 2.1 | Session 6 | Added claim visibility rules: only claim maker sees pending status, non-claimers see unclaimed. Added rate limiting (3 pending claims), cooldown (2 weeks after rejection), withdraw claim feature |
| 2.2 | Session 8 | Implemented Phase 1 curation system: auto-create Country/Artist/Year records on artwork events, maintain denormalized counters, add file cleanup on deletion, wire handlers into artworks.server.ts |
| 2.3 | Session 9 | **Artist Registration on Role Change**: Artists are now registered when a user's role is set to ARTIST. Counts are maintained via claims. Updated browse APIs to reflect this. |
| 2.4 | Session 10 | **Implemented Artist Registration**: Added `ensureArtistExists()` call to "become-artist" and "update-artist-info" actions. Artists automatically register in browse system when role changes to ARTIST. |
| 2.5 | Session 10 | **Artwork Registration Flow Future Decision**: Proposed requiring reference photo for pin registration to prevent duplicates. Documented future verification system approaches (photo-based, location-based, hybrid). Deferred implementation pending further design. |
| 2.6 | Session 11 | **Database Migration to Neon**: Switched from Supabase to Neon serverless PostgreSQL to resolve prepared statement pooling errors. All migrations applied successfully. |
| 2.7 | Session 11 | **Codebase Cleanup**: Removed unused `exifr` and `@types/pg` dependencies, moved `createPhotoPreview` to image-conversion library, verified authorization checks on admin routes. |

---

## Browse Pages Navigation Strategy

### Decision: Hardcoded A-Z for Artists, Dynamic-Ready for Years & Countries
**Date:** Session 7
**Status:** ✅ Implemented

**Problem:**
- Routes should be auto-generated when data exists in database
- Artists might not exist for every letter, but should show A-Z anyway
- Countries and years are derived from artworks, so only relevant ones appear
- Need clarity on navigation strategy across browse pages

**Solution:**

**Artists Browse Page (`/artists`):**
- Display hardcoded **A-Z alphabet** (all 26 letters always visible)
- Use infinite scroll loading (load 3 letters initially, then 1 more as user scrolls)
- Some letters may have zero artists (empty page when clicked) - **this is acceptable**
- Individual artist pages at `/artist/:artistId` with slug format (`alex-peniche`, `yael-montufar`)
- Shows artworks for that specific artist

**Layout:**
- Grouped by letter with divider lines
- Grid layout: 2 columns (mobile), 3 (tablet), 4 (desktop)
- Hover effects match countries/years pages (border highlight + background shift)
- Infinite scroll improves UX for displaying all artists

**Years & Countries (Future Implementation):**
- Years: Dynamic query from `Artwork.yearCreated` distinct values
  - Year range TBD (to be determined when revisiting countries/years)
  - Only years with associated artworks appear
- Countries: Requires schema update first
  - Currently no `country` field in Artwork model (only coordinates + address)
  - Once added, will query distinct country values from artworks
  - Only countries with associated artworks appear

**Why This Approach:**

1. **Artists (Always A-Z):**
   - Users expect alphabet navigation for names
   - Aligns with common UX patterns (phone contacts, business directories)
   - Some letters being empty is normal and acceptable
   - Avoids dynamic loading complexity for this phase

2. **Years & Countries (Dynamic):**
   - Both derived from artwork data (less likely to have empty entries)
   - Geography changes, years change - makes sense to be dynamic
   - Easier to implement dynamic loading once database integration is complete
   - Avoids showing irrelevant options (e.g., countries with no artworks)

**Data Model Notes:**
- Current Artwork schema has `yearCreated: Int?` field (ready for years queries)
- Current Artwork schema **lacks** `country` field (blockers implementation)
- User schema has `artistName` field (available for artist queries if needed)

**Future Work:**
- [ ] Implement dynamic year/country queries when database is wired
- [ ] Add `country` field to Artwork schema
- [ ] Determine year range (minimum/maximum, or all distinct values)
- [ ] Consider location hierarchy: city, state, country (revisit when building map features)

**Implementation Details:**
- File: `app/routes/artists.tsx` - infinite scroll with hardcoded A-Z
- File: `app/routes/artist.$artistId.tsx` - individual artist detail page
- Mock data: 8 artists per letter currently
- Hover effects: Border color change (accent), background shift (primary)
- Responsive: 2-4 column grid depending on viewport

**Benefits:**
- ✅ Consistent UX for alphabet navigation (familiar pattern)
- ✅ No empty browse pages (users can explore any letter)
- ✅ Ready for future dynamic implementation (just replace hardcoded arrays)
- ✅ Clear separation: static (A-Z) vs dynamic (years, countries)
- ✅ Infinite scroll improves perceived performance

**Limitations & Future Improvements:**
- Some letters will be empty (acceptable for MVP)
- Not dynamic (to revisit after country schema update)
- No special character support yet (though could add 0-9 + special chars if needed later)
- Special characters: Could add if artists with names like "!@#$%*" or "1up crew" exist

---

## Artist Registration & Browse System

### Decision: Auto-Register Artists on Role Change
**Date:** Session 10
**Status:** ✅ Implemented

**Problem:**
- Artists becoming a "creator" on the platform needed to be registered for the browse system
- Previously, artists would only appear on browse pages after their first artwork claim was approved
- This created inconsistency: artists existed in User table but not in Artist browse records
- Browse endpoints needed a dedicated Artist table for efficient queries and count tracking

**Solution:**
- When a user changes their role to ARTIST (via "Become an Artist" flow), automatically register them in the browse system
- The Artist record is created/updated via `ensureArtistExists(artistName)` in the "become-artist" action
- When artist information (artist name) is updated, the new artist name is also registered
- Subsequent claims/approvals increment the artist's artwork count
- Counts accurately reflect approved claims, not just artist status

**Implementation Details:**
- **File:** `app/routes/user.profile.tsx`
  - Imported `ensureArtistExists` from curation.server.ts
  - "become-artist" action now calls `ensureArtistExists(artistName)` after updating user role
  - "update-artist-info" action calls `ensureArtistExists(artistName)` if name changed

- **Artist Counter Lifecycle:**
  - **Initial registration:** Counter set to 0 when artist first becomes ARTIST role
  - **Claim approved:** Counter incremented when artwork claim approved
  - **Claim rejected:** Counter decremented when approved claim is rejected
  - **Artwork deleted:** Counter decremented if artwork is deleted

- **Artist Record Fields:**
  ```
  Artist {
    id: String (unique identifier)
    name: String (unique artist name from User.artistName)
    artworkCount: Int (number of claimed, approved artworks)
    createdAt: DateTime
    updatedAt: DateTime
  }
  ```

**Data Flow:**
1. User fills out "Become an Artist" form with `artistName` (and optional contact fields)
2. User.role updated to ARTIST
3. Artist record created/updated in browse system with count = 0
4. User claims artwork → claim status becomes PENDING_APPROVAL (no count increment yet)
5. Admin approves claim → claim status becomes CLAIMED, Artist.artworkCount incremented
6. Artist can update their artist info → new names are registered in browse system
7. If claim rejected → Artist.artworkCount decremented

**Benefits:**
- ✅ Artists appear in browse system immediately upon registration
- ✅ Browse APIs have reliable count data (only approved claims)
- ✅ Separation of concerns: role assignment vs. artwork contribution counting
- ✅ Artists can update their name and it's automatically registered for discovery
- ✅ Consistent with how Country and Year records are auto-created

**Edge Cases Handled:**
- Artist becomes artist but never submits a claim → appears with 0 artworks (acceptable)
- Artist with pending claims not approved yet → count stays at 0
- Artist changes name → old and new names both registered separately (allows multiple artist identities)
- Multiple artists with same name → counted as single artist in browse system

**Rationale:**
Aligns with the simplified artist onboarding approach: users become artists immediately (no approval), but their artwork count only increases when claims are approved. This maintains data integrity while enabling discovery of all registered artists.

---

## Browse API Curation System

### Decision: Auto-Create & Maintain Denormalized Counters for Browse Pages
**Date:** Session 8
**Status:** �� Implemented (Phase 1)

**Problem:**
- Browse pages need to list countries, artists, and years
- This data is derived from artworks and claims
- Need automatic, consistent updates as artworks are created/deleted and claims approved/rejected
- Separate models from User (for artists who claim) to enable true counts and discovery

**Solution: Denormalized Counter Models**

Three new Prisma models track counts:
```
Country {
  id, name (unique), code?, artworkCount (counter)
}

Artist {
  id, name (unique), artworkCount (counter)
}

ArtworkYear {
  id, year (unique), artworkCount (counter)
}
```

**Auto-Creation Strategy:**
1. **Country Creation** (in `createArtwork()`)
   - Extract country name from coordinates via reverse geocode (Nominatim)
   - Create Country record if not exists, increment counter
   - Called automatically when user pins artwork

2. **Artist Creation** (in `approveClaim()`)
   - Extract artist name from user (`artist.artistName`)
   - Create Artist record if not exists, increment counter
   - Called automatically when admin approves claim

3. **Year Creation** (in `approveClaim()`)
   - Extract year from artwork (`artwork.yearCreated`)
   - Create ArtworkYear record if not exists, increment counter
   - Called automatically when admin approves claim (if year provided)

**Counter Maintenance:**
- **Increment:** On create/approve operations
- **Decrement:** On delete/reject operations
- Implemented in `lib/curation.server.ts` with error handling
- Graceful failures: counter issues don't block operations

**API Endpoints Wired:**
- `GET /api/browse/countries` → queries Country records, sorted by count descending
- `GET /api/browse/artists` → queries Artist records, grouped by first letter
- `GET /api/browse/years` → queries ArtworkYear records, sorted by count descending

**File Cleanup on Deletion:**
- When artwork deleted, also delete associated photos from `/public/uploads/`
- Extract filename from photoUrl, attempt filesystem deletion
- Handle missing files gracefully (don't block deletion if file already gone)
- Prevents unbounded storage growth in development

**Implementation Details:**
- File: `app/lib/artworks.server.ts`
  - Import curation functions in `createArtwork()`, `approveClaim()`, `rejectClaim()`, `deleteArtwork()`
  - Call handlers at appropriate lifecycle points
- File: `app/lib/curation.server.ts`
  - Already exists with all counter management functions
  - `ensureCountryExists()`, `ensureArtistExists()`, `ensureYearExists()`
  - `updateCountryCount()`, `updateArtistCount()`, `updateYearCount()`
- Database: New Country, Artist, ArtworkYear tables created via migration

**Benefits:**
- ✅ Browse pages automatically populate as content is added
- ✅ Counters stay accurate through all lifecycle operations
- ✅ No manual syncing needed
- ✅ Graceful error handling (failures don't cascade)
- ✅ File cleanup prevents storage issues
- ✅ Separates concerns: curation logic in dedicated server library

**Data Consistency:**
- Country counter: Incremented when artwork created, decremented when deleted
- Artist counter: Incremented when claim approved, decremented when claim rejected or artwork deleted
- Year counter: Incremented when claim approved with year, decremented when claim rejected or artwork deleted
- Counters maintain accuracy across all crud operations

**Edge Cases Handled:**
- Artwork with no year: `ensureYearExists()` returns null, no year record created (acceptable)
- Geocoding fails: `ensureCountryExists()` logs error and returns null (artwork still created)
- Country/Artist/Year not found on delete: Queries find record, decrement if exists
- File deletion fails: Logged but doesn't block artwork deletion
- Multiple artworks same location: Each creates/increments country (correct behavior)

**Performance Considerations:**
- Counter increments are single UPDATE queries (efficient)
- Denormalized counts avoid expensive COUNT aggregations on browse pages
- Geocoding cached implicitly (Nominatim API results consistent for same coords)
- Browse page queries: `findMany({ orderBy: [count, name] })` with indexes

---

**Last Updated:** Session 8 (Phase 1 Curation Implementation)
**Next Review:** When implementing Phase 2 features (official galleries, notifications)
