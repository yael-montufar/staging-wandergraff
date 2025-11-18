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
**Status:** ��� Implemented

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
- ✅ Smaller file sizes (optimized on client)
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
- **Placeholder Title:** System creates "Untitled Mural at [Address]" placeholder
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

---

**Last Updated:** [Current Session]
**Next Review:** When next major decision is made or architecture changes significantly
