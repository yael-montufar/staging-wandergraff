# WANDERGRAFF Architecture Audit & Integration Plan

**Last Updated**: Current Session  
**Purpose**: Document existing architecture, identify missing integration points, and plan handler implementations for the curation system.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [User-Facing Routes](#user-facing-routes)
4. [Data Models](#data-models)
5. [User Actions & Workflows](#user-actions--workflows)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Missing Integration Points](#missing-integration-points)
8. [Implementation Plan](#implementation-plan)
9. [Dependency Graph](#dependency-graph)

---

## Architecture Overview

The application is a React Router-based street art registry with the following layers:

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend Layer                   │
│  (Routes: /artwork/register, /artwork/upload, /map, etc) │
└─────────────┬───────────────────────────────────────────┘
              │ HTTP Requests (JSON/FormData)
              │
┌─────────────▼───────────────────────────────────────────┐
│              API / Route Action Layer                    │
│  (app/routes/api.*.tsx & app/routes/[page].tsx)          │
│  - Validates auth (cookies)                             │
│  - Coordinates business logic                           │
│  - Returns responses                                    │
└─────────────┬───────────────────────────────────────────┘
              │ Function calls
              │
┌─────────────▼───────────────────────────────────────────┐
│          Server Libraries (app/lib/*.server.ts)          │
│  - artworks.server.ts (create, claim, update, delete)   │
│  - photos.server.ts (create, manage)                    │
│  - collections.server.ts (walls, add/remove)            │
│  - file-upload.server.ts (storage, URLs)                │
│  - auth.server.ts (tokens, users)                       │
│  - curation.server.ts (NEW: counters, side-effects)     │
└─────────────┬───────────────────────────────────────────┘
              │ Prisma Client
              │
┌─────────────▼───────────────────────────────────────────┐
│              PostgreSQL Database                         │
���  (Supabase)                                             │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Authentication & User APIs

| Endpoint | Method | Purpose | Operates On | Auth |
|----------|--------|---------|-------------|------|
| `/api/auth/create-user` | POST | Create/upsert user after OAuth | User | OAuth token |
| `/api/user/upload-avatar` | POST | Upload user avatar | User, File Storage | Cookie |
| `/api/user/walls` | GET | List user's collections | Collection | Cookie |

### Artwork APIs

| Endpoint | Method | Purpose | Operates On | Auth |
|----------|--------|---------|-------------|------|
| `/api/artwork/upload` | POST | Upload photo for artwork | Photo, File Storage | Cookie |
| `/api/artworks/check-location` | POST | Detect duplicate artworks nearby | Artwork | None |
| `/api/artworks/search` | GET | Fuzzy search artworks | Artwork | None |
| `/api/artwork/add-to-wall` | POST | Add artwork to collection | CollectionItem | Cookie |

### Browse/Discover APIs (NEW - Curation Driven)

| Endpoint | Method | Purpose | Operates On | Auth |
|----------|--------|---------|-------------|------|
| `/api/map/hotspots` | GET | Cluster artworks by location | Artwork | None |
| `/api/browse/countries` | GET | List countries by activity | Country (denormalized) | None |
| `/api/browse/artists` | GET | List artists by activity | Artist (denormalized) | None |
| `/api/browse/years` | GET | List years by activity | ArtworkYear (denormalized) | None |

### Admin APIs

| Endpoint | Method | Purpose | Operates On | Auth |
|----------|--------|---------|-------------|------|
| `/api/admin/delete-artwork` | POST | Delete artwork (cascade) | Artwork, Photo, Gallery, File Storage | Admin |

---

## User-Facing Routes

| Route | Component File | Purpose | Key Actions |
|-------|---|---------|------------|
| `/` | `home.tsx` | Gallery grid view | Browse artworks, search |
| `/map` | `map.tsx` | World map with pins | Inspect location, zoom to hotspots, add-to-wall |
| `/artwork/register` | `artwork.register.tsx` | Pin new artwork on map | Create artwork (deduped, geocoded) |
| `/artwork/upload` | `artwork.upload.tsx` | Upload photo to artwork | Create photo, convert HEIC, preserve EXIF |
| `/artwork/:id` | `artwork.$id.tsx` | Artwork detail + gallery | Claim, unclaim, update metadata, add-to-wall |
| `/artists` | `artists.tsx` | Browse by artist letter | Infinite scroll A-Z |
| `/artist/:id` | `artist.$artistId.tsx` | Artist detail page | View artist's artworks |
| `/countries` | `countries.tsx` | Browse by country (NEW) | Click country to see artworks |
| `/countries/:id` | `countries.$id.tsx` | Country detail | Filter artworks by country |
| `/years` | `years.tsx` | Browse by year (NEW) | Click year to see artworks |
| `/years/:year` | `years.$year.tsx` | Year detail | Filter artworks by year |
| `/user/profile` | `user.profile.tsx` | User dashboard | Upload photos, manage walls, privacy |
| `/user/settings` | `user.settings.tsx` | Account settings | Update name, bio, avatar |
| `/collection/new` | `collection.new.tsx` | Create wall | New collection |
| `/collection/:id` | `collection.$id.tsx` | View wall | See/remove artworks in wall |
| `/admin/dashboard` | `admin.dashboard.tsx` | Admin panel | Approve/reject claims, delete artworks |
| `/auth/login` | `auth.login.tsx` | Login page | OAuth / credential login |
| `/auth/signup` | `auth.signup.tsx` | Signup page | Register account |
| `/auth/logout` | `auth.logout.tsx` | Logout action | Clear auth |

---

## Data Models

### User
```
id (pk)
email (unique)
name
role (ARTIST | REGULAR_USER | ADMIN)
avatarUrl
bio
artistName, artistWebsite, artistEmail, artistInstagram, artistTwitter, artistBio
createdAt, updatedAt

Relations:
- CreatedArtworks (1:many) 
- ClaimedArtworks (1:many)
- Photos (1:many)
- Collections (1:many)
- Followers/Following (many:many)
```

### Artwork
```
id (pk)
title
description
latitude (unique with longitude)
longitude (unique with latitude)
address
yearCreated
claimStatus (UNCLAIMED | PENDING_APPROVAL | CLAIMED)
createdById (fk: User)
artistId (fk: User, nullable, when claimed)
rejectedAt (for cooldown enforcement)
createdAt, updatedAt

Indexes: [latitude, longitude] unique, claimStatus, yearCreated
Relations:
- createdBy (User)
- artist (User, optional, when claimed)
- photos (1:many)
- galleries (1:many)
- saves (1:many)
- collectionItems (1:many)
```

### Photo
```
id (pk)
artworkId (fk, optional)
userId (fk: User)
photoUrl
thumbnailUrl
isPrivate
takenAt
uploadedAt
exifLatitude, exifLongitude, exifAltitude
metadata (JSON)
createdAt, updatedAt

Relations:
- artwork (optional)
- user (User)
- galleryPhotos (1:many)
```

### Country (NEW - Denormalized Counter)
```
id (pk)
name (unique)
code (ISO country code, optional)
artworkCount (denormalized counter)
createdAt, updatedAt

Note: Does NOT have direct Artwork relation; counts maintained via curation.server.ts
```

### Artist (NEW - Denormalized Counter)
```
id (pk)
name (unique)
artworkCount (denormalized counter)
createdAt, updatedAt

Note: Separate from User model; User has role=ARTIST; Artist tracks claimed artworks by name
```

### ArtworkYear (NEW - Denormalized Counter)
```
id (pk)
year (unique)
artworkCount (denormalized counter)
createdAt, updatedAt

Note: Does NOT have direct Artwork relation; counts maintained via curation.server.ts
```

### Gallery & GalleryPhoto
```
Gallery:
- id (pk)
- artworkId (fk)
- type (DEFAULT | OFFICIAL)
- createdByArtistId (fk, optional)
- description
- createdAt, updatedAt

GalleryPhoto (join):
- id, galleryId (fk), photoId (fk), order, addedAt

Purpose: Organize photos from community (DEFAULT) vs artist official (OFFICIAL)
```

### Collection & CollectionItem (User Walls)
```
Collection:
- id (pk), userId (fk), name, description, isPublic, createdAt, updatedAt

CollectionItem (join):
- id, collectionId (fk), artworkId (fk), addedAt

Purpose: User can create "walls" and add artworks to them
```

### Save (Bookmarks - Stubbed)
```
id (pk), userId (fk), artworkId (fk), savedAt
Unique: [userId, artworkId]
Note: Model exists but API & UI not implemented (TODOs in saves.server.ts)
```

---

## User Actions & Workflows

### 1. Authenticate
```
User → /auth/login or /auth/signup
  → OAuth callback (Supabase/Social)
  → POST /api/auth/create-user (set cookie)
  → Redirect to home
```

### 2. Pin/Register Artwork
```
User → Click map on /map
  → POST /api/artworks/check-location (dedup check)
  → Navigate to /artwork/register if clear
  → Submit form (geocoded address, optional)
  → POST artwork.register action → createArtwork(latitude, longitude, userId)
  → Returns artworkId
  → Offer link to /artwork/upload?artworkId=ID
```

### 3. Upload Photo
```
User → /artwork/upload?artworkId=ID
  → Client converts image (HEIC → JPEG if needed, preserves EXIF)
  → POST /api/artwork/upload (FormData: file, artworkId, isPrivate)
  → Server: saveUploadedFile() + createPhoto()
  → Returns photoId
  → Redirect to /artwork/:id to see new photo
```

### 4. Claim Artwork (Artist)
```
Artist User → /artwork/:id (artwork claimStatus=UNCLAIMED)
  → Click "Claim Artwork" button
  → POST artwork.$id action (intent: "claim-artwork")
  → Server: validate artist role, check rate limits, call claimArtwork()
  → Set artwork.claimStatus = PENDING_APPROVAL, artistId = userId
  → Show "Pending Admin Review"
```

### 5. Approve/Reject Claim (Admin)
```
Admin → /admin/dashboard
  → See list of artworks with claimStatus=PENDING_APPROVAL
  → Click "Approve" or "Reject"
  → POST admin.dashboard action (intents: "approve-claim" or "reject-claim")
  → If approve: claimStatus = CLAIMED, create OFFICIAL Gallery for artist
  → If reject: rejectedAt = now, claimStatus = UNCLAIMED, artistId = null, notify artist of cooldown
```

### 6. Update Artwork Metadata (Claimed Artist)
```
Artist → /artwork/:id (after claim approved)
  → Edit title, description, yearCreated, address
  → POST artwork.$id action (intent: "update-metadata")
  → Server: validate artistId matches user, update artwork
```

### 7. Add Artwork to Wall/Collection
```
User → /artwork/:id
  → Click "Add to Wall" or select collection
  → POST artwork.$id action (intent: "add-to-wall") OR POST /api/artwork/add-to-wall
  → Server: addArtworkToCollection(collectionId, artworkId)
  → CollectionItem created
```

### 8. Delete Artwork (Admin)
```
Admin → /admin/dashboard
  → Click "Delete" on artwork
  → POST admin.dashboard action (intent: "delete-artwork")
  → Server: validate admin, call deleteArtwork(artworkId)
  → Cascade delete: photos, galleries, collection items, saves
  → Clean up files from storage
  → Decrement Country/Artist/ArtworkYear counters
```

### 9. Browse by Country/Artist/Year (NEW)
```
User → /countries, /artists, or /years
  → Page fetches /api/browse/countries (or artists, years)
  → Server: db.country.findMany (sorted by artworkCount desc)
  → Display tiles sorted by activity
  → Click country → /countries/:id → show artworks in that country
```

### 10. View Map Hotspots
```
User → /map
  → On load, fetch /api/map/hotspots
  → Server: cluster all artworks in grid, return top 30
  → Render clusters on Leaflet
  → Click cluster → zoom to hotspot area
  → Click pin → open drawer with artwork info
```

---

## Data Flow Diagrams

### Flow 1: Artwork Creation & Country Auto-Detection

```
User Click on Map
    ↓
POST /api/artworks/check-location(lat, lon)
    ├─ reverseGeocode(lat, lon) [Nominatim API]
    ├─ Check for duplicate Artwork (dedupe)
    └─ Return { found: bool, artwork?: {...} }
    ↓
If not found, navigate to /artwork/register
    ↓
User fills form (optional: address, year)
    ↓
POST artwork.register action
    ├─ Validate auth
    └─ createArtwork(latitude, longitude, createdById)
        ├─ db.artwork.create()
        ├─ (MISSING) ensureCountryExists(lat, lon) ← NEW HANDLER NEEDED
        │   ├─ reverseGeocode() again → extract country name
        │   └─ db.country.upsert(name) with artworkCount++
        └─ Return artworkId
    ↓
Offer link to /artwork/upload?artworkId=ID
```

**Missing Handler**: Country auto-creation with counter increment

---

### Flow 2: Photo Upload & Gallery Management

```
User @ /artwork/upload?artworkId=ID
    ↓
Client-side: convert image (HEIC→JPEG), create FormData
    ↓
POST /api/artwork/upload
    ├─ Validate auth
    ├─ saveUploadedFile(photoFile)
    │   └─ Save to public/uploads/, return URL
    ├─ createPhoto(userId, photoUrl, artworkId, isPrivate)
    │   └─ db.photo.create()
    └─ (MISSING) Post-create hooks:
        ├─ Generate thumbnail? ← optional
        ├─ Parse EXIF → populate exifLatitude, exifLongitude, takenAt
        ├─ If artwork.claimStatus == CLAIMED and userId == artwork.artistId:
        │   └─ addPhotoToOfficialGallery(photoId, artworkId) ← NEW HANDLER
        └─ Otherwise: addPhotoToDefaultGallery(photoId, artworkId)
    ↓
Return photoId
    ↓
Redirect to /artwork/:id to display new photo
```

**Missing Handlers**: 
- EXIF parsing & field population
- Auto-attach to OFFICIAL gallery if artist uploads
- Thumbnail generation (optional)

---

### Flow 3: Claim Approval Pipeline

```
Artist @ /artwork/:id (claimStatus=UNCLAIMED)
    ↓
Click "Claim Artwork" button
    ↓
POST artwork.$id action (intent: "claim-artwork")
    ├─ Validate auth (role == ARTIST)
    ├─ Check getPendingClaimsCount() < limit
    ├─ Check isArtistInCooldown() == false
    └─ claimArtwork(artworkId, artistId)
        ├─ db.artwork.update({ claimStatus: PENDING_APPROVAL, artistId })
        └─ (MISSING) Emit event: "claim.submitted"
            └─ Notify admins, log audit entry
    ↓
Show "Your claim is under review"
    ↓
[Admin Review Path]
Admin @ /admin/dashboard
    ↓
See PENDING_APPROVAL artworks
    ↓
Choose: Approve or Reject
    ↓
POST admin.dashboard action
    ├─ If approve-claim:
    │   └─ approveClaim(artworkId)
    │       ├─ db.artwork.update({ claimStatus: CLAIMED })
    │       ├─ (MISSING) ensureArtistExists(artistName)
    │       │   └─ db.artist.upsert(name) with artworkCount++
    │       ├─ (MISSING) ensureYearExists(artworkYear)
    │       │   └─ db.artworkYear.upsert(year) with artworkCount++
    │       ├─ (MISSING) createOfficialGallery(artworkId, artistId)
    │       │   └─ db.gallery.create({ type: OFFICIAL })
    │       ├─ (MISSING) promotePhotosToOfficial(artworkId, artistId)
    │       └─ (MISSING) Notify artist: "Claim Approved"
    ↓
    ├─ If reject-claim:
    │   └─ rejectClaim(artworkId)
    │       ├─ db.artwork.update({ claimStatus: UNCLAIMED, artistId: null, rejectedAt: now })
    │       ├─ (MISSING) Notify artist: "Claim Rejected - cooldown X days"
    │       └─ (MISSING) Log rejection reason (if provided)
```

**Missing Handlers**:
- Artist auto-creation with counter
- Year auto-creation with counter
- Official Gallery creation & photo promotion
- Notifications to artist
- Rejection reason logging

---

### Flow 4: Artwork Deletion with Cleanup

```
Admin @ /admin/dashboard
    ↓
Click "Delete Artwork"
    ↓
POST admin.dashboard action (intent: "delete-artwork")
    ├─ Validate admin role
    └─ deleteArtwork(artworkId)
        ├─ Get artwork record (to extract country, artist, year)
        ├─ db.photo.deleteMany({ artworkId })
        │   └─ For each photo: (MISSING) deleteFile(photoUrl) from storage
        ├─ db.gallery.deleteMany({ artworkId })
        │   └─ Cascade to galleryPhotos
        ├─ db.collectionItem.deleteMany({ artworkId })
        ├─ db.save.deleteMany({ artworkId })
        ├─ (MISSING) updateCountryCount(artwork.countryId, -1)
        ├─ (MISSING) updateArtistCount(artwork.artistId, -1)
        ├─ (MISSING) updateYearCount(artwork.yearId, -1)
        ├─ db.artwork.delete({ id: artworkId })
        └─ (MISSING) Notify owner: "Your artwork was removed"
```

**Missing Handlers**:
- File deletion from storage
- Country counter decrement
- Artist counter decrement
- Year counter decrement
- Owner notification

---

### Flow 5: Browse by Country/Artist/Year (NEW)

```
User @ /countries (or /artists or /years)
    ↓
Page loads → fetch /api/browse/countries
    ├─ GET /api/browse/countries (loader)
    │   ├─ db.country.findMany({ orderBy: [artworkCount DESC, name ASC] })
    │   ├─ Return JSON
    │   └─ (DEPENDS ON) countries being created via Flow 1
    └─ Render tiles sorted by activity
    ↓
User clicks country tile
    ↓
Navigate to /countries/:id
    ↓
Loader: fetch artworks WHERE country.name = countryName
    └─ Render artworks for selected country
    ↓
User clicks artwork → /artwork/:id
```

**Dependencies**: Country records must exist (created when artwork registered)

---

### Flow 6: Map Hotspots Clustering

```
User @ /map
    ↓
On mount, fetch /api/map/hotspots
    ├─ GET /api/map/hotspots (loader)
    │   ├─ db.artwork.findMany({ select: [latitude, longitude] })
    │   ├─ clusterArtworks(coords) → grid-based clustering
    │   ├─ Sort by artworkCount DESC
    │   └─ Return top 30 hotspots
    └─ Render clusters on Leaflet map
    ↓
User clicks cluster → zoom to hotspot area
    ↓
Fetch /api/artworks/check-location(lat, lon) for detailed info
    ↓
Show artwork drawer
```

**Dependencies**: Artworks exist (from Flow 1)

---

## Missing Integration Points

The following handlers need to be implemented to ensure all APIs work as expected:

### High Priority (Core Functionality)

#### 1. **Country Auto-Creation & Counter Management**
- **Where**: `app/lib/curation.server.ts` (already created but not wired)
- **Functions**: `ensureCountryExists()`, `updateCountryCount()`
- **Called From**:
  - `app/lib/artworks.server.ts` → `createArtwork()` [NEW]
  - `app/lib/artworks.server.ts` → `deleteArtwork()` [NEW]
- **What it does**:
  - Extract country name from coordinates via `reverseGeocode()`
  - Create Country record if not exists
  - Increment `Country.artworkCount` on create
  - Decrement `Country.artworkCount` on delete
- **Related API**: `/api/browse/countries` depends on Country records existing

#### 2. **Artist Auto-Creation & Counter Management**
- **Where**: `app/lib/curation.server.ts` (already created but not wired)
- **Functions**: `ensureArtistExists()`, `updateArtistCount()`
- **Called From**:
  - `app/lib/artworks.server.ts` → `approveClaim()` [NEW]
  - `app/lib/artworks.server.ts` → `rejectClaim()` [NEW]
  - `app/lib/artworks.server.ts` → `deleteArtwork()` [NEW]
- **What it does**:
  - Create Artist record if not exists (based on User.artistName or infer from user)
  - Increment `Artist.artworkCount` when claim approved
  - Decrement `Artist.artworkCount` when claim rejected or artwork deleted
- **Related API**: `/api/browse/artists` depends on Artist records existing

#### 3. **Year Auto-Creation & Counter Management**
- **Where**: `app/lib/curation.server.ts` (already created but not wired)
- **Functions**: `ensureYearExists()`, `updateYearCount()`
- **Called From**:
  - `app/lib/artworks.server.ts` → `approveClaim()` [NEW]
  - `app/lib/artworks.server.ts` → `rejectClaim()` [NEW]
  - `app/lib/artworks.server.ts` → `deleteArtwork()` [NEW]
- **What it does**:
  - Create ArtworkYear record if not exists (based on `artwork.yearCreated`)
  - Increment `ArtworkYear.artworkCount` when claim approved (if year provided)
  - Decrement `ArtworkYear.artworkCount` when claim rejected or artwork deleted
- **Related API**: `/api/browse/years` depends on ArtworkYear records existing

#### 4. **File Cleanup on Delete**
- **Where**: `app/lib/file-upload.server.ts` [NEW] or `app/lib/artworks.server.ts` [EXTEND]
- **Function**: `deleteFile(photoUrl)` or `deleteArtworkFiles(artworkId)`
- **Called From**:
  - `app/lib/artworks.server.ts` → `deleteArtwork()` [NEW]
  - `app/lib/photos.server.ts` → `deletePhoto()` [if photo deletion route added]
- **What it does**:
  - Extract file path from photoUrl
  - Remove file from `public/uploads/` or storage backend
  - Handle errors gracefully (file may not exist)
  - Optional: log deleted files for audit trail
- **Risk**: Without this, storage grows unbounded

#### 5. **Official Gallery Creation on Claim Approval**
- **Where**: `app/lib/artworks.server.ts` [EXTEND approveClaim()] or new `app/lib/galleries.server.ts`
- **Function**: `createOfficialGallery(artworkId, artistId)`
- **Called From**:
  - `app/lib/artworks.server.ts` → `approveClaim()` [NEW]
- **What it does**:
  - Check if Gallery with type=OFFICIAL exists for artwork
  - If not, create one with `createdByArtistId = artistId`
  - Move artist-uploaded photos from DEFAULT to OFFICIAL gallery
- **Depends On**: Photos exist (from Flow 2)

### Medium Priority (User Experience)

#### 6. **EXIF Data Extraction & Population**
- **Where**: `app/lib/photos.server.ts` [EXTEND createPhoto()]
- **Function**: `extractEXIF(photoFile)` or extend existing exif parsing
- **Called From**:
  - `/api/artwork/upload` → after file saved [NEW]
- **What it does**:
  - Extract EXIF metadata from JPEG
  - Populate `Photo.exifLatitude`, `exifLongitude`, `exifAltitude`
  - Populate `Photo.takenAt` (if photo has date)
  - Optional: validate coords match artwork location
- **Note**: EXIF may already be stripped client-side (see `artwork.upload.tsx`)

#### 7. **Photo Attachment to Gallery (Community vs Official)**
- **Where**: `app/lib/photos.server.ts` or galleries.server.ts [EXTEND createPhoto()]
- **Function**: `attachPhotoToGallery(photoId, artworkId, userId, isArtist)`
- **Called From**:
  - `/api/artwork/upload` → after photo created [NEW]
- **What it does**:
  - Determine gallery type:
    - If `artwork.claimStatus == CLAIMED` AND `userId == artwork.artistId` → OFFICIAL
    - Otherwise → DEFAULT
  - Create GalleryPhoto record
  - Update Gallery.order field for sorting
- **Depends On**: Official gallery exists (from handler #5)

#### 8. **Notification System (Claims, Approvals, Rejections)**
- **Where**: new `app/lib/notifications.server.ts` or extend artworks.server.ts
- **Functions**: `notifyAdminsOfClaim()`, `notifyArtistOfApproval()`, `notifyArtistOfRejection()`
- **Called From**:
  - `app/lib/artworks.server.ts` → `claimArtwork()` [NEW]
  - `app/lib/artworks.server.ts` → `approveClaim()` [NEW]
  - `app/lib/artworks.server.ts` → `rejectClaim()` [NEW]
- **What it does**:
  - Send email or in-app notification
  - Log event to audit trail
  - Optional: trigger webhooks for external systems
- **Note**: Requires email service (Resend, SendGrid, etc.) if email desired

### Low Priority (Nice-to-Have)

#### 9. **Thumbnail Generation**
- **Where**: `app/lib/photos.server.ts` [EXTEND createPhoto()]
- **Function**: `generateThumbnail(photoUrl)`
- **Called From**:
  - `/api/artwork/upload` → after photo created [NEW - optional]
- **What it does**:
  - Create small thumbnail image (e.g., 200x200)
  - Save to storage
  - Update `Photo.thumbnailUrl`
- **Note**: Could be done client-side (in `artwork.upload.tsx`) or as background job

#### 10. **Implement Save/Bookmark Feature**
- **Where**: `app/lib/saves.server.ts` [COMPLETE TODOs]
- **Functions**: `saveArtwork()`, `unsaveArtwork()`, `getSavedArtworks()`
- **API Endpoints Needed**:
  - `POST /api/artwork/save` (or as artwork.$id.tsx intent)
  - `DELETE /api/artwork/save/:artworkId`
  - `GET /api/user/saved`
- **What it does**:
  - Create/delete Save record
  - Support UI button on artwork detail page
- **Note**: Model exists but not fully implemented; low priority if not core feature

---

## Implementation Plan

### Phase 1: Critical Path (Ensure Browse APIs Work)

**Objective**: Make `/api/browse/countries`, `/api/browse/artists`, `/api/browse/years` return meaningful data as artworks are created.

**Tasks** (in order):

1. **Integrate Country Auto-Creation**
   - File: `app/lib/artworks.server.ts` → `createArtwork()`
   - Add call to `ensureCountryExists(latitude, longitude)` before returning
   - Verify `/api/browse/countries` returns data after registering artwork

2. **Integrate Artist Auto-Creation**
   - File: `app/lib/artworks.server.ts` → `approveClaim()` and `rejectClaim()`
   - Add call to `ensureArtistExists(user.artistName)` in `approveClaim()`
   - Add call to `updateArtistCount(artistId, -1)` in both claim paths
   - Verify `/api/browse/artists` returns data after claim approval

3. **Integrate Year Auto-Creation**
   - File: `app/lib/artworks.server.ts` → `approveClaim()` and `rejectClaim()`
   - Add call to `ensureYearExists(artwork.yearCreated)` in `approveClaim()`
   - Add call to `updateYearCount(yearId, -1)` in both claim paths
   - Verify `/api/browse/years` returns data after claim approval

4. **Add File Cleanup on Delete**
   - File: `app/lib/artworks.server.ts` → `deleteArtwork()`
   - Add logic to extract photo URLs, delete files from storage
   - Ensure cascade delete still works

5. **Add Counter Decrements on Delete**
   - File: `app/lib/artworks.server.ts` → `deleteArtwork()`
   - Call `updateCountryCount(countryId, -1)`, `updateArtistCount(artistId, -1)`, `updateYearCount(yearId, -1)`
   - Test: delete artwork, verify counters decrease

### Phase 2: Polish (Gallery & UX)

**Objective**: Improve photo management and user feedback.

6. **Create Official Gallery on Claim Approval**
   - File: `app/lib/artworks.server.ts` → `approveClaim()` (or new `galleries.server.ts`)
   - Check if Gallery type=OFFICIAL exists; create if not
   - Option: Move artist photos from DEFAULT to OFFICIAL

7. **Attach Photos to Gallery on Upload**
   - File: `app/lib/photos.server.ts` → `createPhoto()`
   - After photo created, determine gallery type (OFFICIAL vs DEFAULT)
   - Create GalleryPhoto record with proper order

8. **Extract EXIF Data**
   - File: `/api/artwork/upload` handler (or `photos.server.ts`)
   - Parse EXIF from uploaded file
   - Populate `Photo.exifLatitude`, `exifLongitude`, `takenAt`

### Phase 3: Future (Notifications & Automation)

9. **Implement Notifications**
   - Create `app/lib/notifications.server.ts`
   - Email on claim submission, approval, rejection
   - Optional: in-app notification UI

10. **Optional: Thumbnail Generation**
    - Defer to background job or implement client-side
    - Generate `Photo.thumbnailUrl` on upload

---

## Dependency Graph

```
createArtwork() [CORE]
  ├─ Creates Artwork record
  └─ → ensureCountryExists() ← MISSING: calls country handler
      ├─ reverseGeocode(lat, lon)
      └─ db.country.upsert()

claimArtwork() [EXISTING - WORKS]
  └─ Sets artwork.claimStatus = PENDING_APPROVAL

approveClaim() [EXTEND]
  ├─ Sets artwork.claimStatus = CLAIMED
  ├─ → ensureArtistExists() ← MISSING: calls artist handler
  │   └─ db.artist.upsert()
  ├─ → ensureYearExists() ← MISSING: calls year handler
  │   └─ db.artworkYear.upsert()
  ├─ → createOfficialGallery() ← MISSING: gallery handler
  │   └─ db.gallery.create({ type: OFFICIAL })
  └─ → notifyArtistOfApproval() ← MISSING: notification handler

rejectClaim() [EXTEND]
  ├─ Resets artwork.claimStatus = UNCLAIMED
  ├─ → updateArtistCount(artistId, -1) ← MISSING: decrement
  ├─ → updateYearCount(yearId, -1) ← MISSING: decrement
  └─ → notifyArtistOfRejection() ← MISSING: notification handler

deleteArtwork() [EXTEND]
  ├─ Delete Photo records
  ├─ → deleteFile(photoUrl) ← MISSING: file cleanup
  ├─ Delete Gallery records
  ├─ Delete CollectionItem records
  ├─ → updateCountryCount(countryId, -1) ← MISSING: decrement
  ├─ → updateArtistCount(artistId, -1) ← MISSING: decrement
  ├─ → updateYearCount(yearId, -1) ← MISSING: decrement
  └─ Delete Artwork record

createPhoto() [EXTEND]
  ├─ Creates Photo record
  ├─ → extractEXIF() ← MISSING: EXIF handler
  └─ → attachPhotoToGallery() ← MISSING: gallery attachment handler

API /api/browse/countries ← DEPENDS ON: Country records created via createArtwork()
API /api/browse/artists ← DEPENDS ON: Artist records created via approveClaim()
API /api/browse/years ← DEPENDS ON: ArtworkYear records created via approveClaim()
API /api/map/hotspots ← DEPENDS ON: Artwork records existing
```

---

## Summary Table: What Exists vs What's Missing

| Component | Exists | Status | Missing |
|-----------|--------|--------|---------|
| `Country` model | ✅ Yes | DB schema created | Integration into createArtwork() |
| `Artist` model | ✅ Yes | DB schema created | Integration into approveClaim/rejectClaim |
| `ArtworkYear` model | ✅ Yes | DB schema created | Integration into approveClaim/rejectClaim |
| `ensureCountryExists()` | ✅ Yes | curation.server.ts | Wire into createArtwork() |
| `ensureArtistExists()` | ✅ Yes | curation.server.ts | Wire into approveClaim() |
| `ensureYearExists()` | ✅ Yes | curation.server.ts | Wire into approveClaim() |
| `updateCountryCount()` | ✅ Yes | curation.server.ts | Wire into createArtwork(), deleteArtwork() |
| `updateArtistCount()` | ✅ Yes | curation.server.ts | Wire into approveClaim(), rejectClaim(), deleteArtwork() |
| `updateYearCount()` | ✅ Yes | curation.server.ts | Wire into approveClaim(), rejectClaim(), deleteArtwork() |
| `/api/browse/countries` | ✅ Yes | Endpoint created | Depends on Country records |
| `/api/browse/artists` | ✅ Yes | Endpoint created | Depends on Artist records |
| `/api/browse/years` | ✅ Yes | Endpoint created | Depends on ArtworkYear records |
| `/api/map/hotspots` | ✅ Yes | Endpoint created | Depends on Artwork records |
| File cleanup on delete | ❌ No | Not implemented | Implement in deleteArtwork() |
| Official Gallery creation | ❌ No | Not implemented | Implement in approveClaim() |
| Photo gallery attachment | ❌ No | Not implemented | Implement in createPhoto() |
| EXIF extraction | ⚠️ Partial | Client-side stripping | Full extraction in server |
| Notifications | ❌ No | Not implemented | Email/in-app on claims |
| Save/bookmark feature | ❌ No | Model exists, UI stubbed | Complete saves.server.ts + UI |

---

## Checklist for Implementation

- [ ] Phase 1: Critical Path
  - [ ] Wire `ensureCountryExists()` into `createArtwork()`
  - [ ] Wire `ensureArtistExists()` + counter updates into `approveClaim()`, `rejectClaim()`
  - [ ] Wire `ensureYearExists()` + counter updates into `approveClaim()`, `rejectClaim()`
  - [ ] Wire counter decrements into `deleteArtwork()`
  - [ ] Implement file cleanup in `deleteArtwork()`
  - [ ] Test: Register artwork → check Country record created
  - [ ] Test: Approve claim → check Artist and Year records created
  - [ ] Test: Delete artwork → check counters decremented and files cleaned

- [ ] Phase 2: Polish
  - [ ] Create Official Gallery in `approveClaim()`
  - [ ] Attach uploaded photos to correct gallery in `createPhoto()`
  - [ ] Extract EXIF in upload handler

- [ ] Phase 3: Future
  - [ ] Implement notification system
  - [ ] Complete save/bookmark feature
  - [ ] Add thumbnail generation (optional)

---

## Files to Modify

**High Priority**:
- `app/lib/artworks.server.ts` — Add curation calls to `createArtwork()`, `approveClaim()`, `rejectClaim()`, `deleteArtwork()`
- `app/lib/photos.server.ts` — Add EXIF extraction and gallery attachment to `createPhoto()`
- `app/lib/file-upload.server.ts` — Add `deleteFile()` utility

**Medium Priority**:
- `app/lib/galleries.server.ts` (new or extend collections.server.ts) — Add `createOfficialGallery()`, `attachPhotoToGallery()`
- `app/lib/notifications.server.ts` (new) — Add notification handlers

**Low Priority**:
- `app/routes/api.artwork.upload.tsx` — Call photo handlers
- `app/routes/admin.dashboard.tsx` — Verify claim approval/rejection calls updated functions
- `app/routes/artwork.$id.tsx` — Verify delete action calls updated deleteArtwork()

---

## Related Documentation

- **DECISIONS.md** — Architectural decisions (existing, keep updated)
- **prisma/schema.prisma** — Data model definitions (updated with Country, Artist, ArtworkYear)
- **app/lib/curation.server.ts** — Centralized curation utilities (created, awaiting integration)
- **Test Coverage** — Recommend adding tests for:
  - Country counter consistency after create/delete
  - Artist counter consistency after claim approval/rejection
  - File cleanup verification
  - Duplicate detection edge cases

---

**Document Version**: 1.0  
**Created**: Current Session  
**Next Review**: After Phase 1 implementation
