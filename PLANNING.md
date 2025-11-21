# Street Art Gallery MVP - Project Planning & Architecture

**Project Vision**: Build a community-driven gallery/directory platform for street art (primarily murals) where artists can register works, users can upload photos with automatic location extraction via EXIF data, and discover art nearby through a map-based, filterable interface.

---

## 1. MVP Scope Definition

### In Scope (Phase 1 - MVP)
- **User Management**: Sign up, login, user profiles with roles (artist, regular user)
- **Artwork Registration**: Create artwork entries with:
  - Coordinates (manual or extracted from photo EXIF)
  - Title, artist name, year (artists only)
  - Claims system (artists can claim/create works) - pending approval by admin
- **Photo Upload & EXIF**:
  - Extract GPS coordinates and timestamp from EXIF data
  - Duplicate detection: suggest existing artwork if within ~20m
  - Public and private photos (users can keep photos private before adding to artwork)
  - Store photos tied to artworks
- **Gallery System** (Dual-Gallery Approach):
  - **Default Gallery**: Auto-created for each artwork, contains all public photos from all users (community-driven)
  - **Official Gallery**: Artist-created after claiming artwork, curated selection of their own photos (artist-controlled)
  - Official gallery gets priority display on artwork detail page
- **Home Page Gallery**:
  - Multiple layout options (3-column grid, masonry, full-screen single column, etc.)
  - Display artworks with primary photo
  - Link to artwork detail pages
- **Artwork Detail Pages**:
  - Display official gallery if claimed (artist's curated photos)
  - Default gallery tab/section (all community photos)
  - Timeline view of photos (sorted chronologically)
  - Shows all user contributions
  - Artist info if claimed
  - Activity feed (recent photo uploads by users)
- **Collections** (Pinterest-Style Boards):
  - Users can create/edit/delete collections
  - Add/remove artworks from collections
  - Collections are searchable
  - Collections are followable (Phase 2 actions)
  - Public and private collections
- **Quick Save/Bookmark**:
  - One-click save of artworks (different from adding to collection)
  - Saved artworks accessible from user profile
- **Map View**:
  - Display artworks as pins on map
  - Zoom-based clustering (groups when zoomed out)
  - Pin hover/tap shows artwork grid in modal/drawer
  - Click artwork opens detail view in drawer
  - Contextual activity feed: show recently registered artworks in viewport when no artwork selected
  - When artwork selected on map: show that artwork's recent activity
- **Discovery/Filtering**:
  - Filter by proximity/location radius
  - Basic search (by title, artist name, location)
  - **Browse by Artist**: Alphabetical listing of all claimed artists with artwork counts
  - **Browse by Year**: Chronological listing of years with artwork counts (derived from year_created)
  - **Browse by Country/Region**: Geographic listing with artwork counts
  - Search collections

### Out of Scope (Future Phases)
- **Phase 2**: Comments system, user following (follow users & collections), activity feeds with push notifications
- **Phase 2.5**: Proximity alerts (notifications for nearby art - similar to Pokémon Go), admin/moderator dashboard
- **Phase 3**: AR preview functionality (viewing designs on walls), commissioning workflow
- **Future**: AI-powered duplicate detection, design editing tools, payments/escrow, advanced filtering

---

## 2. Core Entities & Data Model

```
Users
├── id (UUID, Primary Key)
├���─ email (String, Unique)
├── name (String)
├── role (Enum: 'artist' | 'regular_user')
├── avatar_url (String, nullable)
├── bio (String, nullable)
├── created_at (Timestamp)
└���─ updated_at (Timestamp)

Artworks
├── id (UUID, Primary Key)
├── title (String)
├── description (String, nullable)
├── latitude (Float) [core identifier - artwork defined by coordinates]
├── longitude (Float) [core identifier - artwork defined by coordinates]
├── artist_id (FK → Users, nullable) [artist who claimed/created the artwork]
├── year_created (Int, nullable) [filled by artist]
├── claim_status (Enum: 'unclaimed' | 'pending_approval' | 'claimed') [admin approval required]
├── created_by_id (FK → Users) [user who first registered the work]
├── created_at (Timestamp)
├── updated_at (Timestamp)
└── [derived] official_gallery_id (Gallery where artist_id = artists.id and type='official')

Photos
├── id (UUID, Primary Key)
├── artwork_id (FK → Artworks, nullable) [nullable if private photo not yet added to artwork]
├── user_id (FK → Users) [who uploaded the photo]
├── photo_url (String) [stored in cloud storage]
├── thumbnail_url (String) [small version for grid/list views]
├── is_private (Boolean) [true = hidden from default gallery until user adds to artwork]
├── taken_at (Timestamp) [extracted from EXIF or manual input]
├── uploaded_at (Timestamp)
├── exif_latitude (Float, nullable)
├��─ exif_longitude (Float, nullable)
├── exif_altitude (Float, nullable)
└── metadata (JSON, nullable) [other EXIF fields if needed]

Galleries (Auto-created - Dual Gallery System)
├── id (UUID, Primary Key)
├── artwork_id (FK → Artworks)
├── type (Enum: 'default' | 'official')
├── created_by_artist_id (FK → Users, nullable) [if official, the artist who curated it]
├── description (String, nullable) [curator's notes if official gallery]
├── photo_count (Int, computed) [count of photos in this gallery]
├── last_photo_date (Timestamp, computed)
├── created_at (Timestamp)
└── updated_at (Timestamp)

GalleryPhotos (Junction table - which photos appear in which galleries)
├── id (UUID, Primary Key)
├── gallery_id (FK → Galleries)
├── photo_id (FK → Photos)
├── order (Int) [curator's display order for official gallery]
└── added_at (Timestamp)

Saves (Quick bookmarks/saves - different from collections)
├── id (UUID, Primary Key)
├── user_id (FK → Users)
├── artwork_id (FK → Artworks)
├── saved_at (Timestamp)
└── [unique constraint] (user_id, artwork_id)

Collections (MVP - Pinterest-style boards)
├── id (UUID, Primary Key)
├── user_id (FK → Users) [collection owner]
├── name (String)
├── description (String, nullable)
├── is_public (Boolean)
├── created_at (Timestamp)
└── updated_at (Timestamp)

CollectionItems (MVP - artworks in collections)
├── id (UUID, Primary Key)
├── collection_id (FK → Collections)
├── artwork_id (FK → Artworks)
└── added_at (Timestamp)

Follows (Phase 2 - Social graph)
├── id (UUID, Primary Key)
├── follower_id (FK → Users)
├── following_user_id (FK → Users, nullable) [if following a user]
├── following_collection_id (FK → Collections, nullable) [if following a collection]
├── followed_at (Timestamp)
└── [constraint] one of following_user_id or following_collection_id must be non-null
```

### Key Design Decisions:
- **No `artists` table**: Artists are users with role='artist'. This keeps the schema simple and allows transitioning users to artists.
- **Duplicate Detection**: Compare new photo's EXIF coordinates against all existing artworks. If within 20m of an unverified artwork, suggest merge.
- **Gallery Type**: 'default' is auto-created for each artwork. 'official' is created when the artist claims the work.
- **Photo as Source of Truth**: The primary photo (first/most recent) is used as the artwork's cover image on the gallery view.

---

## 3. API Routes & Structure

### Authentication Endpoints
```
POST   /api/auth/signup         → Register new user
POST   /api/auth/login          → Login user
POST   /api/auth/logout         → Logout user
POST   /api/auth/refresh        → Refresh session
GET    /api/auth/me             → Get current user
```

### Artworks Endpoints
```
GET    /api/artworks                    → List artworks (with filters: bounds, radius, search)
POST   /api/artworks                    → Register new artwork
GET    /api/artworks/:id                → Fetch artwork detail with both galleries + activity
PATCH  /api/artworks/:id                → Update artwork (artist only)
POST   /api/artworks/:id/claim          → Request claim (pending admin approval)
GET    /api/artworks/proximity-check    → Check for nearby artworks (for dedup)
POST   /api/artworks/:id/save           → Save/bookmark artwork (quick action)
DELETE /api/artworks/:id/save           → Remove saved artwork
GET    /api/artworks/:id/saves-count    → Get save count for artwork
```

### Photos Endpoints
```
POST   /api/photos                      → Upload new photo (optionally private)
POST   /api/artworks/:id/photos         → Add existing photo to artwork
GET    /api/artworks/:id/photos         → List photos in default gallery (public only)
GET    /api/galleries/:galleryId/photos → List photos in specific gallery (default or official)
DELETE /api/photos/:photoId             → Delete photo (uploader only)
GET    /api/artworks/:id/activity       → Activity feed for artwork (recent photos, activity)
```

### Gallery Endpoints
```
GET    /api/artworks/:id/galleries      → Get both default & official galleries for artwork
POST   /api/artworks/:id/galleries      → Create official gallery (artist only)
PATCH  /api/galleries/:galleryId        → Update gallery (artist only for official)
POST   /api/galleries/:galleryId/photos → Add/reorder photos in official gallery
DELETE /api/galleries/:galleryId/photos/:photoId → Remove photo from official gallery
```

### Collections Endpoints (MVP)
```
GET    /api/collections                 → List user's collections (or public if no auth)
POST   /api/collections                 → Create new collection
GET    /api/collections/:id             → Fetch collection + artworks
PATCH  /api/collections/:id             → Update collection (owner only)
DELETE /api/collections/:id             → Delete collection (owner only)
POST   /api/collections/:id/items       → Add artwork to collection
DELETE /api/collections/:id/items/:artworkId → Remove artwork from collection
GET    /api/collections/:id/followers   → Get followers of collection (Phase 2)
```

### Map Endpoints
```
GET    /api/map/clusters                → Get clustered artwork data for current map bounds/zoom
GET    /api/map/artworks                → Get artwork pins for map at given zoom level
GET    /api/map/activity                → Activity feed for map viewport (recent artworks in bounds)
```

### Users/Artists Endpoints
```
GET    /api/artists                     → List all artists (alphabetical with counts)
GET    /api/artists/:id                 → Fetch artist profile + portfolio
GET    /api/artists/:id/artworks        → List claimed artworks by artist
GET    /api/artists/:id/collections     → List public collections by artist
GET    /api/users/:id/profile           → Fetch user profile
PATCH  /api/users/:id/profile           → Update user profile
GET    /api/users/:id/saves             → Get user's saved artworks
GET    /api/users/:id/collections       → Get user's collections (if owner or public)
```

### Discovery Endpoints
```
GET    /api/discover/artists            → List all claimed artists (alphabetical with artwork counts)
GET    /api/discover/artists/:artistId  → Get artist profile + claimed artworks
GET    /api/discover/years              → List all years (descending) with artwork counts
GET    /api/discover/years/:year        → Get artworks created in specific year
GET    /api/discover/countries          → List countries with artwork counts
GET    /api/discover/regions            → List regions/areas with counts
GET    /api/discover/search             → Global search (artworks, artists, locations, collections)
```

### Admin Endpoints (Phase 2.5)
```
GET    /api/admin/claims                → List pending artwork claims
PATCH  /api/admin/claims/:claimId       → Approve/reject artwork claim
GET    /api/admin/reports               → List user reports of duplicates/issues
```

### Future (Phase 2+) Endpoints
```
POST   /api/follows/users               → Follow a user
DELETE /api/follows/users/:userId       → Unfollow a user
POST   /api/follows/collections         → Follow a collection
DELETE /api/follows/collections/:collectionId → Unfollow a collection
GET    /api/activity/feed               → Social feed (new artworks from followed artists/curators)
```

---

## 4. Route Structure (Frontend)

```
app/
├── routes/
│   ├── home.tsx                    # Home page - gallery grid with layouts
│   ├── auth/
│   │   ├── signup.tsx
│   │   ├── login.tsx
│   │   └─�� logout.tsx
│   ├── artwork/
│   │   ├── [id].tsx                # Artwork detail page + timeline
│   │   └── register.tsx            # Register new artwork
│   ├── map/
│   │   └── index.tsx               # Map view with clustering
│   ├── discover/
│   │   ├── artists.tsx             # Browse artists (alphabetical list with counts)
│   │   ├── years.tsx               # Browse by year (chronological with counts)
│   │   ├── countries.tsx           # Browse by country/region (with counts)
│   │   └── search.tsx              # Global search results
│   ├── profile/
│   │   ├── [userId].tsx            # User/artist profile
│   │   └── settings.tsx            # User settings (profile edit)
│   └── admin/ (future)
│       └── dashboard.tsx           # Admin controls
├── api/                            # Server-side API handlers (React Router actions)
│   ├── auth.server.ts
│   ├── artworks.server.ts
│   ├── photos.server.ts
│   ├── map.server.ts
│   ├── users.server.ts
│   └── upload.server.ts            # Handle file uploads
├── components/
│   ├── ArtworkCard.tsx             # Grid/list item component
│   ├── ArtworkDetail.tsx           # Full artwork view
│   ├── GalleryGrid.tsx             # Grid layout switcher
│   ├── MapView.tsx                 # Map component with clustering
│   ├── PhotoTimeline.tsx           # Chronological photo list
│   ├── PhotoUpload.tsx             # Photo upload with EXIF preview
│   ├── FilterPanel.tsx             # Sidebar filters
│   ├── Navigation.tsx              # Header/nav
│   └── ui/                         # Reusable UI components
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Drawer.tsx
│       └── ...
├── lib/
│   ├── auth.server.ts              # Authentication utilities (server)
│   ├── exif.ts                     # EXIF extraction utilities
│   ├── geo.ts                      # Geolocation utilities (distance calc, clustering)
│   ├── storage.ts                  # Cloud storage handler (file upload/download)
│   ├── validators.ts               # Input validation schemas
│   └── types.ts                    # Shared TypeScript types
├── models/
│   └── db.server.ts                # Database schema & queries (Prisma)
└── app.css                         # Global styles (Tailwind)
```

---

## 5. Authentication & Session Management

**Decision: Use Supabase Auth**
- Built-in PostgreSQL support (pairs well with Prisma)
- Free tier covers MVP
- Email/password authentication out of the box
- Can extend with OAuth (Google, GitHub) later

**Flow**:
1. User signs up → Supabase creates user & session
2. Session stored in HTTP-only cookie (React Router handles this)
3. API routes check session via Supabase middleware
4. Logout clears session cookie

**Role Assignment**:
- On signup, user selects "I'm an artist" toggle
- Stored in `users.role` column
- Used in API authorization checks and UI conditionals

---

## 6. Photo Upload & EXIF Processing

**Flow**:
1. User uploads photo file
2. Extract EXIF data (JavaScript: `exifr` or `piexifjs` library)
3. Display extracted coordinates to user with map preview
4. If nearby artwork exists (within 20m), show dedup dialog
5. On confirm: 
   - Upload file to cloud storage (Netlify Blobs or Supabase Storage)
   - Save photo record with extracted EXIF data
   - Update artwork's `updated_at` timestamp

**Deduplication Logic**:
```
function checkNearbyArtworks(latitude, longitude, radiusMeters = 20) {
  return artworks.filter(artwork => 
    distanceInMeters(latitude, longitude, artwork.latitude, artwork.longitude) <= radiusMeters
  );
}
```

**Storage**: Use **Netlify Blobs** (integrated with React Router) or **Supabase Storage** for simplicity.

---

## 7. Map Implementation

**Library**: Leaflet.js (lightweight, maps library) or Mapbox GL JS (premium but powerful)

**Zoom-Based Behavior**:
- **Zoom 0-10** (country/region view): Show clusters only (group 1-100 artworks per cluster)
- **Zoom 11-16** (city/neighborhood): Show individual pins + clusters if 10+ artworks very close
- **Zoom 17+** (street level): Show all individual pins

**Cluster Component**:
- Hover/tap cluster → Modal/drawer shows grid of 8-10 artworks
- Click artwork in grid → Detail view in same drawer with back button

**Selected Artwork Context**:
- Floating drawer on right/left side (collapsible)
- Shows artwork preview + details
- Contains gallery timeline or detail view
- Can be dismissed or pinned

---

## 8. Home Page Gallery Layouts

**Multiple Layout Options** (toggle in settings or header):
1. **3-Column Grid**: Fixed width cards, responsive
2. **Masonry**: Pinterest-style variable heights
3. **Full-Screen Single Column**: Card takes full width
4. **List View**: Thumbnail + short details on side
5. **Infinite Scroll**: Load more as user scrolls

**Sorting Options**:
- Recently added
- Recently photographed (by last photo)
- Most photographed (by photo count)
- Nearest to me (if location permission granted)

---

## 9. Dual Gallery System - Detailed Design

### Default Gallery
- **Auto-created** when artwork is first registered
- **Contains**: All public photos from all users
- **Visible to**: Everyone
- **Sorting**: Chronological (by taken_at date, newest first)
- **Display**: Shows artwork evolution over time
- **Use case**: Community-driven documentation of the artwork

### Official Gallery
- **Created by**: Artist after claiming artwork (admin approval required)
- **Contains**: Artist's curated selection of photos (can be from any users or their own)
- **Visible to**: Everyone
- **Sorting**: Artist's preferred order (manually curated)
- **Display**: Represents artist's official presentation of their work
- **Use case**: Artist controls how their work is presented to the world

### Display Priority on Artwork Detail Page
1. **Primary display**: Official Gallery (if claimed)
2. **Secondary display**: Default Gallery tab/section (always accessible)
3. **Timeline view**: Shows all photos chronologically (both galleries interleaved by date)

### Gallery Photos Junction Table
The `GalleryPhotos` table manages which photos appear in which galleries:
- Default gallery automatically includes all public photos for the artwork
- Official gallery includes only artist-selected photos in artist-defined order
- A single photo can appear in both galleries
- Deleting a photo removes it from all galleries

### Photo Privacy Workflow
```
User uploads photo
    ↓
User keeps as private (is_private = true)
    ├→ Photo not tied to any artwork
    ├→ Photo not visible in any gallery
    └→ User can share or delete later
        ↓
User decides to add to artwork
    ├→ is_private = false
    ├→ artwork_id is set
    └→ Photo appears in Default Gallery automatically
            ↓
Artist claims artwork, creates Official Gallery
    └→ Artist selects photos to feature
        └→ Selected photos appear in Official Gallery
            └→ Artwork detail now shows Official Gallery as primary
```

---

## 10. Collections System - MVP Design

### What are Collections?
Collections are Pinterest-style boards where users curate and organize artworks they discover. They're different from saves (one-click bookmarks) - collections are thematic groupings that tell a story.

### Collection Features (MVP)
- **Create**: Users can create unlimited collections with name, description, visibility
- **Add Artworks**: Search and add artworks to collections
- **Organize**: Drag-to-reorder artworks within collection
- **Share**: Public collections can be shared and discovered by other users
- **Search**: Collections are searchable by name, description, tags
- **Owner Only**: Only the collection owner can edit/delete

### Collection Types
- **Public**: Visible to all users, searchable, followable (Phase 2)
- **Private**: Visible only to owner, not searchable

### Use Cases
- "Downtown Murals" - geographically organized
- "Portrait Artists" - artist-focused curation
- "Under the Bridge" - location-based discoveries
- "Street Art for Beginners" - thematic/educational

### Collections vs Saves
- **Saves**: Quick one-click bookmark, no organization
- **Collections**: Thematic curation with description and order

### Phase 2 Social Features
- **Follow Collections**: Users can follow public collections from other curators
- **Activity**: See when followed collections get new additions
- **Discovery**: Find popular collections and tastemakers

---

## 10.5. Browse by Artist - Discovery Feature

### What is Browse by Artist?
A dedicated page listing all claimed artists in alphabetical order with artwork count. Users can browse to discover artists and view their full portfolio.

### Artist List Page
- **Display**: Alphabetical list of artists (A-Z)
- **For Each Artist**:
  - Artist name
  - Avatar/profile picture
  - Bio preview (if filled)
  - Artwork count
  - Follower count (Phase 2)
- **Interaction**: Click artist card to view profile + portfolio

### Artist Profile Page
- **Shows**:
  - Artist bio, avatar
  - All claimed artworks (grid or list)
  - Follower count & follow button (Phase 2)
  - Link to their collections (if created)
  - Filter options (by year, by location)
- **Derived Data**:
  - Artwork count (COUNT from artworks WHERE artist_id)
  - Years active (MIN/MAX year_created)
  - Geographic reach (distinct locations)

### Queries
```sql
-- Artists list with counts
SELECT
  u.id, u.name, u.avatar_url, u.bio,
  COUNT(a.id) as artwork_count
FROM users u
LEFT JOIN artworks a ON u.id = a.artist_id AND a.claim_status = 'claimed'
WHERE u.role = 'artist'
GROUP BY u.id
ORDER BY u.name ASC;

-- Artist portfolio (all claimed works)
SELECT a.* FROM artworks a
WHERE a.artist_id = $1 AND a.claim_status = 'claimed'
ORDER BY a.year_created DESC NULLS LAST;
```

---

## 10.6. Browse by Year - Discovery Feature

### What is Browse by Year?
A dedicated page listing all years in which street art was created (or claimed/registered) in chronological order with artwork count. Similar to graffiti-database.com/years.

### Years List Page
- **Display**: Years in descending order (newest first)
- **For Each Year**:
  - Year number (e.g., "2023", "2024")
  - Artwork count in that year
  - Thumbnail grid of 3-4 artworks from that year (preview)
- **Interaction**: Click year to view all artworks from that year

### Year Detail Page
- **Shows**:
  - Year with artwork count
  - Grid/list of all artworks created in that year
  - Sorting: by location, by artist, by date registered
  - Filters: by artist, by location/country
- **Derived Data**:
  - Count per year (COUNT from artworks WHERE year_created = X)

### Queries
```sql
-- Years list with counts (descending)
SELECT
  a.year_created as year,
  COUNT(*) as artwork_count
FROM artworks a
WHERE a.claim_status = 'claimed' AND a.year_created IS NOT NULL
GROUP BY a.year_created
ORDER BY a.year_created DESC;

-- Artworks for specific year
SELECT a.* FROM artworks a
WHERE a.year_created = $1 AND a.claim_status = 'claimed'
ORDER BY a.created_at DESC;
```

### Notes
- Only claimed artworks count (those with year_created filled by artist)
- Can also derive "registered in year" separate from "created in year" if useful (e.g., artwork created 2015, registered 2024)
- For unclaimed artworks without year_created, they don't appear in year browse (only in general home feed)

---

## 11. Following System - Phase 2 Design

### What Can You Follow? (Phase 2)
1. **Other Users**: Follow artists to see their new claimed works, follow curators with great taste
2. **Collections**: Follow specific collections to get updates when new artworks are added

### Following Users
- Follow any artist to see their artwork on your social feed (Phase 2)
- Follow any regular user (curators) to discover their taste in street art
- See follower count on artist/user profiles

### Following Collections
- Follow public collections from other users
- Get notified when new artworks are added
- See collection owner's comments/notes on new additions

### Social Discovery Graph
```
User A (tastemaker/curator)
├── Created "Downtown Murals" collection
├── Gets 100+ followers
└── Users discovering street art through this collection

User B (artist)
├── Claimed 5 artworks
├── Gets 50+ followers
└── New followers see their new works via social feed
```

### Activity Feeds (Phase 2)
- **Social Feed**: Artworks from users you follow, collections you follow
- **Artist Feed**: New artworks claimed by artists you follow
- **Curator Feed**: New artworks added to collections you follow

### Implementation Notes
- Use `Follows` table with polymorphic pattern (following_user_id OR following_collection_id)
- Avoid creating redundant data - derive feeds from follows + creation events
- Can add caching layer later for feed performance

---

## 12. Contextual Activity Feeds

Activity feeds are derived from existing data, showing context-appropriate content based on where the user is in the app.

### Activity Feed Locations

**1. Artwork Detail Page**
- **Content**: Recent photos uploaded to this artwork
- **Sorting**: Chronological (newest first)
- **Derived from**: `Photos` table filtered by artwork_id, ordered by uploaded_at
- **Display**: Timeline view showing each photo contributor, date taken, date uploaded
- **Refresh**: Real-time or every 30 seconds

**2. Map View - No Artwork Selected**
- **Content**: Recently registered artworks in current map viewport
- **Sorting**: Chronological (newest registered first)
- **Derived from**: `Artworks` within map bounds, ordered by created_at
- **Display**: Feed of artwork cards with preview photos + contributor count
- **Refresh**: When map pans/zooms, when new artworks added to viewport

**3. Map View - Artwork Selected**
- **Content**: Recent activity for that specific artwork
- **Sorting**: Chronological (newest first)
- **Derived from**: Recent photos + claims + edits for artwork_id
- **Display**: Lightweight activity list (timeline style)
- **Refresh**: Real-time or every 30 seconds

**4. Social Feed (Phase 2)**
- **Content**: New artworks from followed artists, new items in followed collections
- **Sorting**: Chronological (newest first)
- **Derived from**: Joins Artworks/CollectionItems with Follows table
- **Display**: Mixed feed of artwork cards + collection updates
- **Refresh**: Real-time or every minute

**5. User Profile Page**
- **Content**: Artworks claimed by user, new photos uploaded to their claimed works
- **Sorting**: Chronological or by engagement
- **Derived from**: Artworks with artist_id, Photos with recent user uploads
- **Display**: Portfolio of their work + recent activity

### Activity Feed Queries

```sql
-- Recent photos for artwork timeline
SELECT p.* FROM photos p
WHERE p.artwork_id = $1 AND p.is_private = false
ORDER BY p.taken_at DESC
LIMIT 50;

-- Recent artworks in map viewport
SELECT a.* FROM artworks a
WHERE a.latitude BETWEEN $1 AND $2
  AND a.longitude BETWEEN $3 AND $4
ORDER BY a.created_at DESC
LIMIT 20;

-- Activity for specific artwork (photos + metadata)
SELECT
  'photo' as type,
  p.id, p.photo_url, p.uploaded_at, p.user_id, u.name
FROM photos p
JOIN users u ON p.user_id = u.id
WHERE p.artwork_id = $1 AND p.is_private = false
UNION ALL
SELECT
  'claim' as type,
  a.id, null, a.updated_at, a.artist_id, u.name
FROM artworks a
JOIN users u ON a.artist_id = u.id
WHERE a.id = $1 AND a.claim_status = 'claimed'
ORDER BY updated_at DESC
LIMIT 50;
```

### Performance Optimization
- Paginate results (10-20 items per page)
- Cache activity feeds with short TTL (1-5 minutes)
- Index on created_at, uploaded_at for sorting
- Consider materialized views for complex joins

---

## 13. Database Setup & ORM

**Decision: Prisma + Supabase (PostgreSQL)**
- Prisma provides type-safe database queries
- Supabase PostgreSQL is managed and free tier is generous
- Easy to scale and migrate

**Setup Steps**:
1. Create Supabase project
2. Write Prisma schema (`prisma/schema.prisma`)
3. Generate Prisma Client
4. Use Prisma in server-side loaders/actions

---

## 14. File Organization - Detailed Breakdown

### `/app/lib/`
- `auth.server.ts`: Session validation, role checks, user lookup
- `exif.ts`: Extract EXIF data from image files (client-side)
- `geo.ts`: Distance calculations, clustering algorithm, bounds validation
- `storage.ts`: Upload to Netlify Blobs / Supabase Storage
- `validators.ts`: Zod or similar for input validation
- `types.ts`: Shared TypeScript types (Artwork, Photo, User, etc.)

### `/app/models/`
- `db.server.ts`: Prisma setup + helper query functions
  - `createArtwork()`, `getArtwork()`, `updateArtwork()`
  - `createPhoto()`, `getPhotosByArtwork()`
  - `getNearbyArtworks()`, `getArtworksByArtist()`
  - etc.

### `/app/api/`
- Each file exports a React Router action for POST/PATCH/DELETE
- Or a loader for GET requests
- Example: `artworks.server.ts` exports actions for create/update/delete artwork

---

## 15. Proximity & Clustering Algorithm

**For Dedup Detection**:
```typescript
function findNearbyArtworks(lat: number, lon: number, radiusM: number) {
  // Use PostGIS in PostgreSQL (ST_Distance) for efficient geo queries
  // OR simple haversine formula in JavaScript if dataset is small
}
```

**For Map Clustering**:
- At high zoom levels, use a simple grid-based clustering
- At low zoom levels, use Leaflet.markercluster library
- Store cluster centers and artwork counts in the response

**Database Optimization**:
- Add index on (latitude, longitude) for geo queries
- Or use PostGIS extension for native geospatial queries

---

## 16. Error Handling & Validation

**Input Validation**:
- Coordinates within valid range (-90 to 90 lat, -180 to 180 lon)
- Photo file size limits (e.g., max 10MB)
- Title/description length limits
- Email validation for signup

**User Feedback**:
- Toast notifications for success/error
- Loading states during uploads
- Validation error messages next to form fields

---

## 17. Performance Considerations

**Image Optimization**:
- Generate thumbnail versions on upload
- Use responsive image formats (WebP with fallbacks)
- Lazy-load photos in timeline view

**API Caching**:
- Cache artworks by bounding box (invalidate on new upload)
- Cache artist list (invalidate weekly or on new artist)
- Cache country/region counts (invalidate monthly)

**Database Queries**:
- Paginate results (20-50 per page)
- Index frequently-queried columns (user_id, artwork_id, coordinates)

---

## 18. Future-Proofing

### Collections System (MVP - Already Implemented)
- Schema: `Collections`, `CollectionItems` tables included in MVP
- API endpoints: Create, read, update, delete collections and items
- Routes: `/collections/:id`, `/api/collections`
- Phase 2: Add follow collections, search, activity feeds

### Following System (Phase 2)
- Schema: `Follows` table already defined (supports both users and collections)
- Add endpoints for follow/unfollow users and collections
- Implement social feed derived from follows + creation events
- Add "followers" count to users and collections

### Comments (Phase 2)
- Add `Comments` table (user_id, artwork_id, content, created_at)
- Add comment endpoints & components
- Comments on artworks (like YouTube) not reviews (like Google Maps)

### AR Preview (Phase 3)
- Add `Designs` table (artist_id, image_url, metadata)
- Separate routes for AR preview (heavy client-side rendering)
- Use TensorFlow.js or Three.js for AR

### Commissioning (Phase 3+)
- Add `Projects` table (commissioner_id, artist_id, status, terms)
- Add `ProjectMessages` for discussion channel
- Add payment integration (Stripe)

---

## 19. Tech Stack Summary

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Framework** | React Router v7 | Full-stack, SSR, built-in actions |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS | Utility-first, already configured |
| **Database** | Supabase (PostgreSQL) | Managed, free tier, Prisma support |
| **ORM** | Prisma | Type-safe, excellent DX |
| **Auth** | Supabase Auth | Built-in, no extra setup |
| **Storage** | Netlify Blobs / Supabase Storage | Easy file uploads, CDN |
| **Maps** | Leaflet.js or Mapbox GL | Lightweight, feature-rich |
| **Image Processing** | EXIF.js / exifr | Extract metadata from photos |
| **Validation** | Zod | Type-safe validation |
| **UI Components** | Headless UI + Tailwind | Accessible, customizable |

---

## 20. Development Roadmap

### Week 1: Setup
- [ ] Set up Supabase project & PostgreSQL database
- [ ] Write Prisma schema
- [ ] Set up authentication flow (signup/login)
- [ ] Create basic routing structure

### Week 2-3: Core Features
- [ ] Implement photo upload with EXIF extraction
- [ ] Build artwork registration flow
- [ ] Implement duplicate detection
- [ ] Create artwork detail page with photo timeline

### Week 3-4: Discovery & Gallery
- [ ] Build home page with multiple layout options
- [ ] Implement filtering & search
- [ ] Create artist & country browse pages
- [ ] Add map view with clustering

### Week 5: Polish & Testing
- [ ] Performance optimization
- [ ] Error handling & edge cases
- [ ] User feedback refinement
- [ ] Mobile responsiveness

---

## 21. Decisions from User Feedback

**17.1 Duplicate Detection Strategy**
- Start with proximity-based suggestions (20m radius check)
- If duplicates detected, prompt user with dialog showing nearby artworks
- Users can then report false positives → accumulate reports for future AI detection
- Decision: No AI detection in MVP. Phase 3+ candidate.

**17.2 Photo Upload Limits**
- Set configurable limits (e.g., 10 photos per user per artwork, 100 total per user)
- Store limits in environment config
- Allow enabling/disabling limits without code changes
- Decision: Implement configurable limits from day 1 to allow flexibility.

**17.3 Artwork Claim Verification**
- Claimed artworks placed in `claim_status = 'pending_approval'`
- Admin dashboard (Phase 2.5) reviews and approves/rejects claims
- Until approved, artwork still displays but artist_id field remains empty
- Decision: Trust-based registration, but admin verification for claims to prevent abuse.

**17.4 Private Photos**
- Users can upload photos as private (`is_private = true`)
- Private photos are not tied to artwork initially
- User can choose to add private photo to artwork later (makes it public)
- Artist can create official gallery from any photos (encourages photo sharing)
- Decision: Support private photos from day 1.

**17.5 Location/Coordinates**
- Artwork entities are defined by coordinates (latitude, longitude) as core identifiers
- Only Artwork entities have coordinates - photos can have EXIF GPS data but for reference only
- Users cannot change artwork coordinates once registered (location is immutable)
- Decision: Coordinates are the identity of the artwork, no fuzzy/hidden locations needed.

**17.6 Photo Deletion Permissions**
- Only the user who uploaded the photo can delete it
- Artist can only curate the official gallery (add/remove from their selection)
- Artist cannot delete photos from the default gallery
- Decision: Clear ownership - uploader has full control, artist has curation control.

**17.7 Admin/Moderator Tools**
- Keep admin functionality in consideration from the start (schema + API endpoints)
- Implement admin dashboard in Phase 2.5
- For MVP: admin capabilities exist but no UI (could be done manually or via simple SQL)
- Decision: Design for admin workflow, implement UI later.

---

## 22. Security & Rate Limiting

**Rate Limiting**:
- Photo uploads: 5 per minute per user
- Artwork registration: 10 per day per user (adjustable)
- API requests: 100 per minute per IP (standard rate limit)
- Claim requests: 1 per artwork per user (prevent spam)

**File Upload Security**:
- Validate file MIME types server-side (jpg, png, webp)
- File size limit: configurable (suggest 10MB per file)
- Virus scanning: integrate ClamAV or similar (cloud function)
- Store files in cloud storage with CDN (no direct server upload)
- Generate unique filenames to prevent overwrites

**Authentication & Authorization**:
- Use Supabase Auth with HTTP-only cookies
- JWT token refresh on each request
- Check user role before allowing artist-only actions
- Verify user ownership before allowing photo/collection deletion

**Data Privacy**:
- Coordinates are public (artwork defined by location)
- Private photos hidden from public APIs
- User email not exposed in public profiles
- Implement basic privacy policy (Phase 1)

**CORS & API Security**:
- Restrict API to frontend domain only
- Use CSRF tokens for state-changing requests
- Implement API key system for future third-party access (Phase 3+)
- Validate input lengths and types

**Database Security**:
- Enable RLS (Row-Level Security) on PostgreSQL tables
- Restrict direct table access - all through API
- Regular backups enabled (Supabase automatic)
- No sensitive data in logs (PII filtering)

**Monitoring**:
- Log failed authentication attempts
- Alert on unusual activity patterns
- Track user reports and flagged content
- Integrate Sentry for error monitoring (Phase 2)

---

## Next Steps

1. **Connect Supabase**: Use the Builder MCP to link Supabase project
2. **Create Prisma Schema**: Define database structure
3. **Set Up Routes**: Create React Router file structure
4. **Implement Auth**: Build signup/login flows
5. **Build Upload System**: Photo upload + EXIF extraction
6. **Create Home Gallery**: Multiple layout options
7. **Implement Map**: Leaflet integration with clustering

---

**Last Updated**: [Date]  
**Status**: MVP Planning Complete - Ready for Implementation
