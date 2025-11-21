# Street Art Gallery MVP - Visual Diagrams & Architecture

## 1. Sitemap - Page Structure

```
ROOT
├── / (Home)
│   ├── Home Feed (multiple layouts: grid, masonry, single-column)
│   └── Filters & Search Panel
│
├── /auth
│   ├── /auth/signup
│   ├── /auth/login
│   └── /auth/logout
│
├── /artwork
│   ├── /artwork/register
│   │   └── Photo Upload → EXIF → Coordinates → Form
│   └── /artwork/[id]
│       ├── Default Gallery (all photos)
│       ├── Official Gallery (if claimed)
│       ├── Photo Timeline
│       ├── Activity Feed
│       └── Save/Bookmark & Add to Collection
│
├── /map
│   ├── Map View
│   ├── Clustering (zoom-based)
│   ├── Artwork Grid Modal (from clusters)
│   └── Artwork Detail in Drawer
│
├── /discover
│   ├── /discover/artists
│   │   ├── Artists Directory (alphabetical, with counts)
│   │   └── /discover/artists/[id] (Artist Profile + Portfolio)
│   ├── /discover/years
│   │   ├── Years Directory (chronological, with counts)
│   │   └── /discover/years/[year] (Artworks from that year)
│   ├── /discover/countries
│   │   ├── Countries Directory (with counts)
│   │   └── /discover/countries/[country] (Artworks in that country)
│   ├── /discover/search
│   │   └── Global Search Results
│   └── /discover/collections
│       ├── Collections Directory (searchable, followable)
│       └── /discover/collections/[id] (Collection Detail + Artworks)
│
├── /profile
│   ├── /profile/[userId]
│   │   ├── User Bio (if artist: portfolio)
│   │   ├── Claimed Artworks (if artist)
│   │   ├── Saved Artworks
│   │   ├── Collections (public)
│   │   └── Followers/Following (Phase 2)
│   └── /profile/settings
│       └── Edit Profile, Privacy, Preferences
│
├── /collections
│   ├── /collections/my
│   │   └── My Collections (list, create, edit, delete)
│   └── /collections/[id]
│       ├── Collection Details
│       ├── Curated Artworks Grid
│       └── Follow Button (Phase 2)
│
├── /saves
│   └── My Saved Artworks (bookmarks)
│
└── /admin (Phase 2.5)
    ├── /admin/claims
    │   └── Pending Artwork Claims (approve/reject)
    └── /admin/reports
        └── Duplicate/Issue Reports
```

---

## 2. Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA DIAGRAM                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                     USERS
                        ┌──────────────────────────┐
                        │  id (UUID)               │
                        │  email                   │
                        │  name                    │
                        │  role ('artist'|'user')  │
                        │  avatar_url              │
                        │  bio                     │
                        │  created_at              │
                        └──────────────────────────┘
                                    ▲
                    ┌───────────────┼───────────────┐
                    │               │               │
              (artist_id)   (created_by_id)  (follower_id)
                    │               │               │
                    ▼               ▼               ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │  ARTWORKS    │   │    PHOTOS    │   │   FOLLOWS    │
            ├──────────────┤   ├──────────────┤   ├──────────────┤
            │ id           │   │ id           │   │ id           │
            │ title        │   │ artwork_id──────→│ follower_id──┘
            │ latitude     │   │ user_id──────┐   │ following... │
            │ longitude    │   │ photo_url    │   │ followed_at  │
            │ artist_id────┐   │ is_private   │   └──────────────┘
            │ claim_status │   │ taken_at     │
            │ year_created │   │ uploaded_at  │
            │ created_at   │   │ exif_*       │
            └──────────────┘   └──────────────┘
                    │                   │
              (artwork_id)        (user_id)
                    │                   │
                    ▼                   │
            ┌──────────────┐            │
            │  GALLERIES   │            │
            ├──────────────┤            │
            │ id           │            │
            │ artwork_id───┐            │
            │ type         │            │
            │ creator_id   │            │
            │ description  │            │
            └──────────────┘            │
                    │                   │
            (gallery_id)        (photo_id)
                    │                   │
                    ▼                   ▼
            ┌──────────────┐   ┌──────────────┐
            │GALLERY_PHOTOS│   │    SAVES     │
            ├──────────────┤   ├──────────────┤
            │ id           │   │ id           │
            │ gallery_id───┘   │ user_id──────┘
            │ photo_id─────────→│ artwork_id───┐
            │ order        │   │ saved_at     │
            └──────────────┘   └──────────────┘
                                        │
                                  (artwork_id)
                                        │
                                        ▼
                            ┌──────────────────────┐
                            │  COLLECTIONS         │
                            ├──────────────────────┤
                            │ id                   │
                            │ user_id──────────────┤
                            │ name                 │
                            │ is_public            │
                            │ created_at           │
                            └──────────────────────┘
                                        │
                                (collection_id)
                                        │
                                        ▼
                            ┌──────────────────────┐
                            │ COLLECTION_ITEMS     │
                            ├──────────────────────┤
                            │ id                   │
                            │ collection_id────────┤
                            │ artwork_id───────────→ (ARTWORKS)
                            │ added_at             │
                            └──────────────────────┘
```

---

## 3. User Journey Flows

### 3.1 Artist User Journey

```
START: Artist User
    │
    ▼
[Sign Up / Login]
    │
    ▼
[Create/Claim Artwork]
    ├─→ Option A: Register New Work
    │   ├─ Fill: Title, Year, Description (optional)
    │   ├─ Input: Manual coordinates OR upload photo with EXIF
    │   └─ Check: Proximity (within 20m of existing work?)
    │       ├─ Yes: Suggest merge with existing (dedup)
    │       └─ No: Create new artwork (status: 'unclaimed')
    │
    └─→ Option B: Claim Existing Work
        ├─ Browse nearby artworks (map or proximity check)
        ├─ Select artwork to claim
        └─ Submit claim request (status: 'pending_approval')
    │
    ▼
[Admin Approves Claim] (status: 'claimed', artist_id set)
    │
    ▼
[Create Official Gallery]
    ├─ Select curated photos (from any users)
    ├─ Set display order
    └─ Publish official gallery
    │
    ▼
[Upload Photos] (optional)
    ├─ Upload own photos of their work
    ├─ Option: Keep private or add to default gallery
    └─ Featured in official gallery
    │
    ▼
[View Portfolio]
    ├─ Profile shows all claimed works
    ├─ View default gallery (community photos)
    ├─ View official gallery (their curation)
    └─ See follower count (Phase 2)
    │
    ▼
[Browse Discovery]
    ├─ Artists directory (see their rank)
    ├─ Years directory (see their works by year)
    ├─ Countries directory (see geographic spread)
    └─ Collections (if user created any)
    │
    ▼
[Social Features - Phase 2]
    ├─ Gain followers
    ├─ Follow other artists/curators
    ├─ Follow collections
    └─ See activity feed
```

### 3.2 Regular User Journey (Photo Contributor)

```
START: Regular User
    │
    ▼
[Sign Up / Login]
    │
    ▼
[Discover Artworks]
    ├─→ Option A: Home Feed
    │   ├─ Browse grid/masonry of all artworks
    │   ├─ Filter by proximity/location
    │   └─ Click artwork card
    │
    ├─→ Option B: Map View
    │   ├─ View nearby artworks on map
    │   ├─ Click cluster → see grid of works
    │   └─ Click artwork → see details in drawer
    │
    ├─→ Option C: Discovery Pages
    │   ├─ Browse artists (alphabetical)
    │   ├─ Browse years (chronological)
    │   ├─ Browse countries (geographic)
    │   └─ Search (title, artist, location)
    │
    └─→ Option D: Collections
        ├─ Browse public collections
        ├─ Follow collection (Phase 2)
        └─ See curated artworks
    │
    ▼
[View Artwork Detail]
    ├─ See artist info (if claimed)
    ├─ View official gallery (if claimed) / default gallery
    ├─ See photo timeline (artwork evolution)
    ├─ See activity feed (recent photos)
    ├─ Add to collection (quick action)
    └─ Save/bookmark artwork
    │
    ▼
[Contribute Photos]
    ├─ Upload photo of artwork they found
    ├─ EXIF auto-extracts: coordinates, date taken
    ├─ Option: Keep private initially
    ├─ Proximity check: Is this same artwork?
    │   ├─ Yes: Add to existing artwork
    │   └─ No: New artwork registration (unclaimed)
    └─ Photo added to default gallery
    │
    ▼
[Curate Collections]
    ├─ Create personal collection ("My Favorite Murals")
    ├─ Add artworks to collection
    ├─ Make public or private
    ├─ Share collection link (Phase 2: followable)
    └─ See analytics: followers (Phase 2)
    │
    ▼
[View Profile]
    ├─ See saved artworks
    ├─ See created collections
    ├─ Edit bio (become "curator")
    └─ Follower count (Phase 2)
    │
    ▼
[Social Features - Phase 2]
    ├─ Follow artists (see their new works)
    ├─ Follow curators (discover their taste)
    ├─ Follow collections (get updates)
    ├─ Get proximity alerts (like Pokémon Go)
    └─ Receive activity feed
```

### 3.3 Admin/Moderator Journey (Phase 2.5)

```
START: Admin/Moderator
    │
    ▼
[View Admin Dashboard]
    │
    ▼
[Manage Claims]
    ├─ View pending claims (status: 'pending_approval')
    ├─ Review claim details
    ├─ Check artist info + submitted photos
    └─ Action: Approve → claim_status = 'claimed'
    │              Reject → claim_status = 'unclaimed'
    │
    ▼
[Review Reports]
    ├─ Duplicate artwork reports (proximity-based)
    ├─ Inappropriate content flags
    └─ Merge artworks (if legit duplicate)
    │
    ▼
[Monitor Activity]
    ├─ View recent uploads
    ├�� Check user activity patterns
    └─ Flag suspicious behavior
```

---

## 4. Photo Upload & Duplicate Detection Flow

```
User uploads photo
    │
    ▼
Extract EXIF data
    ├─ GPS coordinates (latitude, longitude)
    ├─ Timestamp (date photo was taken)
    └─ Altitude (optional)
    │
    ▼
[Proximity Check]
    │ Query: SELECT artworks WHERE distance < 20m
    │
    ├─→ No nearby artworks found
    │   │
    │   ▼
    │   [Save photo as private - optional]
    │   [Later: User can add to new or existing artwork]
    │
    └─→ Nearby artworks found (≤ 20m)
        │
        ▼
        [Show dialog to user]
        │ "We found similar artworks nearby. Is this one of them?"
        │ Show thumbnail + info of nearby works
        │
        ├─→ User selects existing artwork
        │   │
        │   ▼
        │   [Add photo to that artwork]
        │   [Photo appears in default gallery]
        │
        ├─→ User says "No, it's different"
        │   │
        │   ▼
        │   [Report suggestion if same coordinates exactly]
        │   [For Phase 3: Accumulate reports for AI detection]
        │   [Create new artwork at these coordinates]
        │
        └─→ User skips/ignores
            │
            ▼
            [Create new artwork at these coordinates]
            [Default gallery starts with this photo]
```

---

## 5. Gallery System Flow

```
ARTWORK REGISTERED
    │
    ▼
DEFAULT GALLERY (Auto-created)
    │
    ├─ Contains: All public photos from all users
    ├─ Visible: Everyone
    ├─ Managed: Auto-managed (photos added when made public)
    ├─ Sorting: Chronological (photo taken_at date)
    └─ Purpose: Community documentation of artwork evolution
    │
    └─→ (Photos appear here automatically when is_private=false)
            │
            ▼
            Photo1 (taken 2020-05-15, uploaded 2024-01-10, user1)
            Photo2 (taken 2022-03-20, uploaded 2024-02-15, user2)
            Photo3 (taken 2024-01-05, uploaded 2024-01-20, user3)
            │ [Sorted by taken_at: Photo1 → Photo2 → Photo3]
            │
            └─→ Timeline view shows artwork evolution


ARTIST CLAIMS ARTWORK (claim_status = 'claimed')
    │
    ▼
OFFICIAL GALLERY (Artist-created & curated)
    │
    ├─ Contains: Artist's selected photos (any user photos)
    ├─ Visible: Everyone
    ├─ Managed: Artist curates + reorders
    ├─ Sorting: Artist's preferred order
    └─ Purpose: Artist's official presentation of their work
    │
    └─→ Artist selects & orders photos:
            │
            ▼
            Photo2 (selected by artist)
            Photo1 (selected by artist)
            Photo3 (not selected)
            │ [Reordered by artist: Photo2 → Photo1]
            │
            └─→ Official Gallery shown as primary on detail page


ARTWORK DETAIL PAGE DISPLAY
    │
    ├─ If artist has claimed:
    │   │
    │   ▼
    │   [Official Gallery Tab] (primary, featured)
    │   │ Artist's curated selection + reorder
    │   │
    │   └─ [Default Gallery Tab] (secondary)
    │       Community photos in chronological order
    │
    └─ If unclaimed:
        │
        ▼
        [Default Gallery] (only one, primary)
        │ Community photos in chronological order
```

---

## 6. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React Router v7)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ Pages                                                           │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │ /            (Home Gallery)                                    │       │
│  │ /auth/*      (Signup, Login, Logout)                           │       │
│  │ /artwork/*   (Register, Detail, Timeline)                      │       │
│  │ /map         (Map View with Clustering)                        │       │
│  │ /discover/*  (Artists, Years, Countries, Search, Collections)  │       │
│  │ /profile/*   (User Profile, Settings)                          │       │
│  │ /collections/* (Collections CRUD)                              │       │
│  │ /saves       (Bookmarked Artworks)                             │       │
│  │ /admin/*     (Phase 2.5)                                       │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    ▲                                        │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         │                          │                          │            │
│  ┌──────▼────────────┐     ┌───────▼──────────┐      ┌───────▼────────┐  │
│  │ Components        │     │ Utilities        │      │ State Mgmt     │  │
│  ├──────────────────┤     ├──────────────────┤      ├────────────────┤  │
│  │ Gallery          │     │ EXIF Extraction  │      │ Auth Context   │  │
│  │ ArtworkCard      │     │ Geolocation      │      │ User Session   │  │
│  │ Map              │     │ Image Upload     │      │ (via Supabase) │  │
│  │ Photos Timeline  │     │ Validators       │      └────────────────┘  │
│  │ Filters          │     │ Clustering       │                          │
│  └──────────────────┘     └──────────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ HTTP/REST API
                                    ▼
┌───────────────────────────────────────────────────────────────���─────────────┐
│                    BACKEND (React Router Server Actions)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ API Handlers (app/api/*.server.ts)                              │       │
│  ├─────────────────────────────────────────────────────────────────┤       │
│  │ /api/auth/*              (Login, Signup, Session)              │       │
│  │ /api/artworks            (CRUD, Claim, Proximity Check)         │       │
│  │ /api/photos              (Upload, Delete)                       │       │
│  │ /api/galleries           (Manage Official Gallery)              │       │
│  │ /api/map/*               (Clusters, Activity)                   │       │
│  │ /api/discover/*          (Artists, Years, Countries, Search)    │       │
│  │ /api/collections         (CRUD, Items)                          │       │
│  │ /api/users/*             (Profile, Saves)                       │       │
│  │ /api/admin/*             (Phase 2.5)                            │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         │                          │                          │            │
│  ┌──────▼─────────────┐  ┌────────▼────────────┐    ┌────────▼──────────┐ │
│  │ Business Logic     │  │ Database Layer      │    │ External Services │ │
│  ├────────────────────┤  ├───��─────────────────┤    ├───────────────────┤ │
│  │ Photo processing   │  │ Prisma ORM          │    │ Supabase Auth     │ │
│  │ EXIF extraction    │  │ Queries + Mutations │    │ Storage (Blobs)   │ │
│  │ Geolocation logic  │  │ Indexes             │    │ PostgreSQL DB     │ │
│  │ Clustering algo    │  │ RLS (Row-Level Sec) │    │ Virus Scanning    │ │
│  │ Dedup detection    │  │ Transactions        │    │ (Phase)           │ │
│  └────────────────────┘  └─────────────────────┘    └───────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Prisma Client
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER (PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Users │ Artworks │ Photos │ Galleries │ GalleryPhotos │ Collections │    │
│  Saves │ CollectionItems │ Follows │ ...                               │
│                                                                             │
│  Indexes: (latitude, longitude), (user_id), (artwork_id), ...             │
│  PostGIS extension: for geographic queries                                │
│  RLS Policies: Row-level security per user                               │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────��─┘
                                    ▲
                                    │
                        ┌───────────┴────────────┐
                        │                        │
                ┌───────▼──────────┐    ┌────────▼────────┐
                │ Supabase Storage │    │ Netlify Blobs   │
                ├───────────────────┤    ├─────────────────┤
                │ Photo files       │    │ Photo files     │
                │ Thumbnails        │    │ Thumbnails      │
                │ CDN delivery      │    │ CDN delivery    │
                └───────────────────┘    └─────────────────┘
```

---

## 7. Data Flow Diagram - Photo Upload Sequence

```
USER UPLOADS PHOTO
        │
        ▼
   [Browser]
        │ 1. User selects photo file
        │
        ▼
   EXIF EXTRACTION
        │ 2. JavaScript extracts EXIF data
        │    (coordinates, timestamp, altitude)
        │
        ▼
   SHOW PREVIEW
        │ 3. Display extracted coords on map
        │    User can verify/adjust
        │
        ▼
   PROXIMITY CHECK (API)
        │ 4. POST /api/artworks/proximity-check
        │
        ▼
   [BACKEND]
        │ 5. Query: SELECT * FROM artworks
        │            WHERE distance(lat, lon) < 20m
        │
        ▼
   RESULTS
        ├─→ Found nearby artworks
        │   │ 6. Return artwork suggestions
        │   │
        │   ▼
        │   [Browser]
        │   7. Show dialog: "Is this one of these?"
        │
        └─→ No nearby artworks
            │ 8. Proceed to upload
            │
            ▼
   UPLOAD FILE
        │ 9. POST /api/photos
        │    - File blob
        │    - EXIF data
        │    - Artwork ID (if merging)
        │
        ▼
   [BACKEND - File Processing]
        │ 10. Save to cloud storage (Netlify Blobs)
        │
        ▼
   [BACKEND - Database]
        │ 11. INSERT INTO photos (
        │         user_id, artwork_id, photo_url,
        │         taken_at, exif_latitude, exif_longitude
        │     )
        │
        ▼
   [BACKEND - Gallery Logic]
        │ 12a. If is_private = false:
        │      INSERT INTO gallery_photos (
        │          gallery_id=default_gallery,
        │          photo_id
        │      )
        │
        │ 12b. If artwork new (from new registration):
        │      INSERT INTO artworks (...)
        │      INSERT INTO galleries (type='default')
        │      INSERT INTO gallery_photos
        │
        ▼
   UPDATE TIMESTAMPS
        │ 13. UPDATE artworks SET updated_at=NOW()
        │
        ▼
   RESPONSE
        │ 14. Return success + artwork detail
        │
        ▼
   [Browser]
        │ 15. Redirect to /artwork/[id]
        │     Show updated gallery with new photo
        │
        ▼
   END
```

---

## 8. Collection Curation Flow

```
USER DISCOVERS ARTWORKS
        │
        ├─ Home feed
        ├─ Map view
        ├─ Artist profile
        ├─ Search results
        └─ Year/Country browse
        │
        ▼
[Sees artwork they like]
        │
        ├─→ Save/Bookmark (quick action)
        │   │ Stored in SAVES table
        │   │ No organization needed
        │   │ Access via /saves
        │   │
        │   └─ Artworks list (simple)
        │
        └─→ Add to Collection (curated)
            │ 1. Create new collection
            │    Name: "Downtown Murals"
            │    Description: "My favorite murals downtown"
            │    Public: true/false
            │
            ▼
            2. Add artwork to collection
            │  [+] Add More Artworks
            │
            ▼
            3. Organize
            │  Drag to reorder artworks
            │  Edit collection description
            │  Change privacy (public/private)
            │
            ▼
            4. Share & Discover
            │  Share link to collection
            │  Collection appears in discovery
            │  Other users can follow (Phase 2)
            │  Followers see new additions (Phase 2)
            │
            └─→ Collection becomes "social board"
                Similar to Pinterest boards
```

---

## 9. Map Interaction & Clustering Flow

```
USER OPENS MAP
        │
        ▼
GET MAP BOUNDS & ZOOM LEVEL
        │
        ▼
[Zoom Level ≤ 10: Country/Region View]
    │
    ▼
    [Show Clusters Only]
    │ Each cluster = 1-100 artworks
    │ Icon shows count
    │ Query: SELECT clusters WHERE bounds = viewport
    │
    ├─→ Hover/Tap cluster
    │   │
    │   ▼
    │   [Show Modal/Drawer]
    │   │ Grid of 8-10 artworks in cluster
    │   │
    │   └─→ Click artwork
    │       │
    │       ▼
    │       [Show Detail in Drawer]
    │       │ Full artwork preview
    │       │ + Save, Add to Collection buttons
    │       │ + View Full Page button
    │       │
    │       └─→ Click "View Full"
    │           └─ Redirect to /artwork/[id]
    │
    └─→ Click cluster to zoom in
        │
        ▼
        [Zoom Level 11-16: City/Neighborhood View]
        │ Show individual pins + clusters if 10+ nearby
        │
        ├─→ Hover/Tap individual pin
        │   │
        │   ▼
        │   [Show Tooltip]
        │   │ Artwork title + artist (if claimed)
        │   │ 1 photo preview
        │   │
        │   └─→ Click pin
        │       └─ [Show Detail in Drawer] (same as above)
        │
        └─→ Continue zooming in...
            │
            ▼
            [Zoom Level 17+: Street Level]
            │ All individual pins visible
            │ No clusters
            │
            └─→ Same interaction as above
                │
                ▼
            [Activity Sidebar]
            │ "Recently registered in this area"
            │ Shows feed of new artworks in viewport
            │ Updates when map pans/zooms
```

---

## 10. Admin Approval Flow for Artwork Claims

```
ARTIST CLAIMS ARTWORK
        │
        ▼
POST /api/artworks/[id]/claim
        │
        ▼
[BACKEND]
    │ UPDATE artworks
    │ SET artist_id = $1,
    │     claim_status = 'pending_approval'
    │
    ▼
[NOTIFICATION to Admin - Phase 2.5]
    │
    ▼
ADMIN DASHBOARD
    │ GET /api/admin/claims (pending list)
    │
    ├─→ View claim details
    │   │ - Artwork info
    │   │ - Photos
    │   │ - Artist info
    │   │ - Submitted description
    │   │
    │   ▼
    │   [Admin Reviews & Decides]
    │   │
    │   ├─→ Approve
    │   │   │ PATCH /api/admin/claims/[claimId]
    │   │   │ claim_status = 'claimed'
    │   │   │
    │   │   ▼
    │   │   [Artwork detail updated]
    │   │   - Artist name displayed
    │   │   - Can create official gallery
    │   │   - Can edit artwork details
    │   │
    │   └─→ Reject
    │       │ PATCH /api/admin/claims/[claimId]
    │       │ claim_status = 'unclaimed'
    │       │ artist_id = NULL
    │       │ (status remains 'unclaimed', open for re-claim)
    │       │
    │       ▼
    │       [Artist notified - Phase 2.5]
    │       Reason for rejection provided
    │       Can resubmit claim
    │
    └─→ End Review
```

---

## 11. Search & Discovery Architecture

```
SEARCH INPUTS & RESULTS
        │
        ├─ Global Search: /api/discover/search?q=query
        │  └─ Results: Artworks, Artists, Locations, Collections
        │
        ├─ Artist Search: /discover/artists (browse alphabetical)
        │  └─ Click artist → /profile/[artist_id]
        │
        ├─ Year Search: /discover/years (browse chronological)
        │  └─ Click year → /discover/years/[year]
        │
        ├─ Location Search: /discover/countries (browse geographic)
        │  └─ Click country → /discover/countries/[country]
        │
        ├─ Collection Search: /discover/collections (searchable)
        │  └─ Click collection → /collections/[id]
        │
        └─ Map Search: /map (interactive map)
           └─ Click artwork → /artwork/[id]

DERIVED DATA (computed from queries)
        │
        ├─ Artwork counts per artist
        │  SELECT COUNT(*) FROM artworks GROUP BY artist_id
        │
        ├─ Artwork counts per year
        │  SELECT COUNT(*) FROM artworks GROUP BY year_created
        │
        ├─ Artwork counts per country
        │  (Derived from artwork coordinates + geolocation)
        │
        ├─ Follower counts
        │  SELECT COUNT(*) FROM follows
        │  GROUP BY following_user_id / following_collection_id
        │
        └─ Photo counts per artwork
           SELECT COUNT(*) FROM photos GROUP BY artwork_id
```

---

## 12. Authentication & Authorization Matrix

```
┌────────────────────────────────────────────────────────────────────────────┐
│ RESOURCE/ACTION           │ Anonymous │ Regular User │ Artist    │ Admin   │
├────────────────────────────────────────────────────────────────────────────┤
│ View home gallery         │ ✓ (public)│ ✓            │ ✓         │ ✓       │
│ View artwork detail       │ ✓ (public)│ ✓            │ ✓         │ ✓       │
│ View photo timeline       │ ✓ (public)│ ✓            │ ✓         │ ✓       │
│ Browse discovery pages    │ ✓ (public)│ ✓            │ ✓         │ ✓       │
├───────────���────────────────────────────────────────────────────────────────┤
│ Sign up / Login           │ ✓         │ ✗ (logged in)│ ✗         │ ✗       │
│ Edit own profile          │ ✗         │ ✓            │ ✓         │ ✓       │
├────────────────────────────────────────────────────────────────────────────┤
│ Upload photos             │ ✗         │ ✓            │ ✓         │ ✓       │
│ Delete own photos         │ ✗         │ ✓ (owner)    │ ✓ (owner) │ ✓       │
│ Create new artwork        │ ✗         │ ✓            │ ✓         │ ✓       │
│ Claim artwork             │ ✗         │ ✗            │ ✓         │ ✓       │
├────────────────────────────────────────────────────────────────────────────┤
│ Create official gallery   │ ✗         │ ✗            │ ✓ (claimed)│ ✓      │
│ Edit official gallery     │ ✗         │ ✗            │ ✓ (their) │ ✓       │
│ Update artwork details    │ ✗         │ ✗            │ ✓ (claimed)│ ✓      │
├────────────────────────────────────────────────────────────────────────────┤
│ Create collection         │ ✗         │ ✓            │ ✓         │ ✓       │
│ Edit collection           │ ✗         │ ✓ (owner)    │ ✓ (owner) │ ✓       │
│ Add to collection         │ ✗         │ ✓            │ ✓         │ ✓       │
│ Delete collection         │ ✗         │ ✓ (owner)    │ ✓ (owner) │ ✓       │
├────────────────────────────────────────────────────────────────────────────┤
│ Save/bookmark artwork     │ ✗         │ ✓            │ ✓         │ ✓       │
│ Follow users/collections  │ ✗         │ ✓ (Phase 2)  │ ✓ (Phase 2)│ ✓      │
├────────────────────────────────────��───────────────────────────────────────┤
│ View pending claims       │ ✗         │ ✗            │ ✗         │ ✓       │
│ Approve/reject claims     │ ✗         │ ✗            │ ✗         │ ✓       │
│ View user reports         │ ✗         │ ✗            │ ✗         │ ✓       │
│ Merge duplicate artworks  │ ✗         │ ✗            │ ✗         │ ✓       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

**Visual Diagram Legend:**
- `▼` = Process flow (downward)
- `→` = Conditional path
- `├─` = Option/branch point
- `│` = Continuation
- `✓` = Allowed
- `✗` = Not allowed

**Last Updated**: [Date]
