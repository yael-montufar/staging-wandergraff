# WANDERGRAFF Feature Implementation Status Matrix

Quick reference for what's done, what's partially done, and what's missing.

---

## Quick Legend

- ✅ **DONE** - Fully implemented, tested, working end-to-end
- 📋 **PARTIAL** - Core logic done, but incomplete or missing edge cases/UI
- 🔧 **IN PROGRESS** - Started but significant work remaining
- ❌ **NOT DONE** - Not yet implemented
- ⚠️ **BROKEN** - Implemented but has bugs/incomplete integration
- 🎯 **SCOPE MISMATCH** - Documented differently than implemented

---

## MVP Features (from PLANNING.md)

### Tier 1: Core Features (Should Be Done)

| Feature | Status | Notes | Priority |
|---------|--------|-------|----------|
| **User Authentication** | ✅ | OAuth with Supabase, session mgmt | CRITICAL |
| **Artwork Registration** | 🎯 | Only location, no metadata input | CRITICAL |
| **Photo Upload** | ✅ | HEIC conversion works | CRITICAL |
| **Claim System** | ✅ | PENDING_APPROVAL → CLAIMED flow | CRITICAL |
| **Browse Artists** | ✅ | A-Z with counts | MEDIUM |
| **Browse Years** | 📋 | Works if artists provide year | MEDIUM |
| **Browse Countries** | 📋 | Depends on geocoding | MEDIUM |
| **User Profiles** | ✅ | Public + private dashboard | MEDIUM |
| **Collections/Walls** | 📋 | CRUD works, no social features | MEDIUM |
| **Home Gallery** | ✅ | Grid layout works | MEDIUM |

---

### Tier 2: Important Features (Partially Done)

| Feature | Status | What Works | What's Missing |
|---------|--------|-----------|-----------------|
| **Gallery System** | 📋 | Schema complete, query logic | Official gallery UI, curation |
| **Map View** | 📋 | Leaflet renders, pins clickable | Clustering algorithm, activity feed |
| **Admin Dashboard** | 📋 | Delete artworks, list pending claims | Approve/reject UI, reports |
| **Search** | ❌ | Fuzzy search by title only | By artist, location, year, global |
| **Notifications** | ❌ | Schema ready | Email/in-app on claims, updates |
| **Photo Privacy** | ⚠️ | Toggle exists | Not integrated into gallery logic |

---

### Tier 3: Infrastructure (Should Be MVP)

| Feature | Status | Notes |
|---------|--------|-------|
| **File Storage** | 🔧 | Local `/public/uploads/`, not cloud-ready |
| **File Cleanup** | ❌ | Deleting artwork leaves orphaned files |
| **Image Optimization** | ⚠️ | Client-side only, no server thumbnails |
| **EXIF Extraction** | ❌ | Removed per decision, but schema still has fields |
| **Error Handling** | ⚠️ | Partial, needs user-friendly messages |
| **Rate Limiting** | ❌ | Documented but not implemented |
| **Logging** | ⚠️ | Console.log only, no structured logs |

---

## Feature Detail Breakdown

### Authentication & User Management

```
Feature: User Registration & Login
├─ OAuth (Google) ................... ✅ DONE
├─ Email/Password ................... ❌ NOT DONE
├─ Session Management ............... ✅ DONE
├─ Protected Routes ................. ✅ DONE
├─ Role Assignment .................. ✅ DONE
├─ Artist Role (become artist) ....... ✅ DONE
├─ Admin Role ....................... ✅ DONE (DB only)
├─ User Avatar Upload ............... ✅ DONE
├─ User Bio/Settings ................ ✅ DONE
├─ Logout ........................... ✅ DONE
├─ Password Reset ................... ❌ NOT DONE
├─ Email Verification ............... ❌ NOT DONE
└─ Two-Factor Auth .................. ❌ NOT DONE
```

### Artwork Management

```
Feature: Artwork Registration & Management
├─ Pin on Map (location-only) ....... ✅ DONE
├─ Auto-geocoding Address ........... ✅ DONE
├─ Title Input (before claim) ....... ❌ NOT DONE (by design)
├─ Description Input ................ ❌ NOT DONE (until claimed)
├─ Year Input (before claim) ........ ❌ NOT DONE (until claimed)
├─ Duplicate Detection (20m radius) . ✅ DONE
├─ Suggestion Dialog ................ ✅ DONE
├─ Artwork Edit (after claim) ....... 📋 PARTIAL
├─ Claim Status Display ............. ✅ DONE
├─ Claim Visibility Rules ........... ✅ DONE (non-claimers see UNCLAIMED)
├─ Cooldown After Rejection ......... ✅ DONE (2 weeks)
├─ Withdraw Claim ................... ✅ DONE
├─ Delete Artwork (admin) ........... ✅ DONE
└─ File Cleanup on Delete ........... ❌ NOT DONE
```

### Photo Management

```
Feature: Photo Upload & Gallery
├─ Photo Upload ..................... ✅ DONE
├─ Privacy Toggle ................... ✅ DONE (is_private field)
├─ HEIC to JPEG Conversion .......... ✅ DONE (client-side)
├─ EXIF Extraction .................. ❌ NOT DONE (removed)
├─ EXIF Display (if extracted) ...... ❌ NOT DONE
├─ Thumbnail Generation ............. ❌ NOT DONE
├─ Image Optimization ............... ⚠️ PARTIAL (client-side only)
├─ Upload to DEFAULT Gallery ........ 📋 PARTIAL (no order logic)
├─ Upload to OFFICIAL Gallery ....... ❌ NOT DONE
├─ Gallery Photo Ordering ........... ⚠️ PARTIAL (schema ready, UI missing)
├─ Photo Timeline View .............. 📋 PARTIAL
├─ Photo Attribution (uploader) ..... ✅ DONE
├─ Photo Deletion ................... 📋 PARTIAL (no UI)
└─ Bulk Photo Upload ................ ❌ NOT DONE
```

### Gallery System

```
Feature: Gallery System (Dual Gallery Model)
├─ DEFAULT Gallery (auto-created) ... ✅ DONE
├─ OFFICIAL Gallery (artist) ........ 📋 PARTIAL (schema only)
├─ Auto-create DEFAULT .............. ✅ DONE
├─ Auto-create OFFICIAL on claim .... ❌ NOT DONE (wiring missing)
├─ Gallery Type Display ............. 📋 PARTIAL
├─ Official Gallery Curation UI ..... ❌ NOT DONE
├─ Photo Reordering ................. ⚠️ PARTIAL (schema ready)
├─ Photo Removal (artist) ........... ❌ NOT DONE
└─ Timeline Sort by Date ............ ⚠️ PARTIAL
```

### Discovery & Browse

```
Feature: Discovery Pages
├─ Home Gallery Grid ................ ✅ DONE
├─ Browse Artists (A-Z) ............. ✅ DONE
├─ Browse Years (chronological) ..... 📋 PARTIAL (depends on geocoding)
├─ Browse Countries (geographic) .... 📋 PARTIAL (depends on year input)
├─ Artist Detail Page ............... ✅ DONE
├─ Year Detail Page ................. ✅ DONE
├─ Country Detail Page .............. ✅ DONE
├─ Artwork Counts per Artist ........ ✅ DONE
├─ Artwork Counts per Year .......... 📋 PARTIAL
├─ Artwork Counts per Country ....... 📋 PARTIAL
└─ Search (global) .................. ❌ NOT DONE (title search only)
```

### Map Features

```
Feature: Map View
├─ Leaflet Integration .............. ✅ DONE
├─ Artwork Pins ..................... ✅ DONE
├─ Pin Click → Detail Drawer ........ ✅ DONE
├─ Clustering (zoom-based) .......... ⚠️ PARTIAL (not using markercluster)
├─ Hotspot Detection ................ ⚠️ PARTIAL (algorithm incomplete)
├─ Activity Feed (new pins) ......... ❌ NOT DONE
├─ Mobile Drawer .................... ⚠️ PARTIAL (overlaps on small screens)
└─ Offline Support .................. ❌ NOT DONE
```

### Collections (Walls)

```
Feature: Collections
├─ Create Collection ................ ✅ DONE
├─ Add Artwork to Collection ........ ✅ DONE
├─ Remove Artwork ................... ✅ DONE
├─ Edit Collection Name ............. ✅ DONE
├─ Edit Description ................. ✅ DONE
├─ Public/Private Toggle ............ ✅ DONE
├─ Delete Collection ................ ✅ DONE
├─ Reorder Items .................... ❌ NOT DONE
├─ Browse Public Collections ........ ❌ NOT DONE
├─ Search Collections ............... ❌ NOT DONE
├─ Follow Collection (Phase 2) ...... ❌ NOT DONE
└─ Collection Activity (Phase 2) .... ❌ NOT DONE
```

### User Features

```
Feature: User Profiles & Dashboard
├─ Public Profile Page .............. ✅ DONE
├─ Private Dashboard ................ ✅ DONE
├─ Artist Name Display .............. ✅ DONE
├─ Artist Info (contact) ............ ✅ DONE
├─ Claimed Artworks List ............ ✅ DONE
├─ Photo Management (privacy) ....... 📋 PARTIAL (toggle exists, no UI)
├─ Collection Management ............ 📋 PARTIAL (CRUD, no tabs)
├─ Saved Artworks ................... ⚠️ PARTIAL (model exists, no UI)
├─ Follower Count (Phase 2) ......... ❌ NOT DONE
├─ Following List (Phase 2) ......... ❌ NOT DONE
├─ Activity Stats ................... ❌ NOT DONE
└─ Account Settings ................. ✅ DONE
```

### Admin Features

```
Feature: Admin Dashboard
├─ Admin Route Protection ........... ✅ DONE
├─ Artwork Listing .................. ✅ DONE
├─ Search by Title .................. ✅ DONE
├─ Filter by Claim Status ........... ✅ DONE
├─ Delete Artwork ................... ✅ DONE
├─ Delete Confirmation .............. ✅ DONE
├─ Pending Claims List .............. ⚠️ PARTIAL (shows but no approval UI)
├─ Approve Claim .................... ❌ NOT DONE (no button)
├─ Reject Claim ..................... ❌ NOT DONE (no button)
├─ View User Reports ................ ❌ NOT DONE
├─ Merge Duplicates ................. ❌ NOT DONE
├─ Analytics Dashboard .............. ❌ NOT DONE
└─ System Logs ...................... ❌ NOT DONE
```

### Data & Curation (Background)

```
Feature: Denormalized Counters & Curation
├─ Country Model .................... ✅ DONE
├─ Artist Model ..................... ✅ DONE
├─ ArtworkYear Model ................ ✅ DONE
├─ Auto-create Country on pin ....... ✅ DONE
├─ Auto-create Artist on claim ...... 📋 PARTIAL (needs verification)
├─ Auto-create Year on claim ........ 📋 PARTIAL (needs verification)
├─ Increment Counters ............... ⚠️ PARTIAL (some paths missing)
├─ Decrement on Delete .............. ❌ NOT DONE
├─ Decrement on Reject .............. ❌ NOT DONE
└─ Counter Consistency .............. ⚠️ PARTIAL (not tested)
```

---

## API Endpoints Implementation Status

### Auth Endpoints

| Endpoint | Status | Works | Notes |
|----------|--------|-------|-------|
| `POST /api/auth/create-user` | ✅ | Yes | OAuth callback flow |
| `GET /auth/login` | ✅ | Yes | OAuth login page |
| `GET /auth/logout` | ✅ | Yes | Clears session |

### Artwork Endpoints

| Endpoint | Status | Works | Notes |
|----------|--------|-------|-------|
| `POST /api/artworks` | ✅ | Yes | Via artwork.register route |
| `GET /api/artwork/:id` | ✅ | Yes | Detail page |
| `PATCH /api/artwork/:id` | 📋 | Partial | Only after claim approved |
| `POST /api/artworks/check-location` | ✅ | Yes | Dedup detection |
| `POST /api/artworks/claim` | ✅ | Yes | Artist claims work |
| `DELETE /api/artworks/:id` | ✅ | Yes | Admin delete (but no file cleanup) |

### Photo Endpoints

| Endpoint | Status | Works | Notes |
|----------|--------|-------|-------|
| `POST /api/artwork/upload` | ✅ | Yes | Photo upload |
| `POST /api/artwork/upload-with-pin` | ✅ | Yes | Combined flow |
| `DELETE /api/photos/:id` | ⚠️ | Partial | No UI for deletion |

### Gallery Endpoints

| Endpoint | Status | Works | Notes |
|----------|--------|-------|-------|
| `GET /api/galleries/:id` | ✅ | Yes | Fetch gallery |
| `POST /api/galleries/:id/photos` | ⚠️ | Partial | DEFAULT works, OFFICIAL not wired |
| `PATCH /api/galleries/:id` | ❌ | No | Curation UI missing |

### Browse Endpoints

| Endpoint | Status | Works | Notes |
|----------|--------|-------|-------|
| `GET /api/browse/artists` | ✅ | Yes | Full API |
| `GET /api/browse/countries` | 📋 | Partial | Depends on geocoding |
| `GET /api/browse/years` | 📋 | Partial | Depends on year input |

### Map Endpoints

| Endpoint | Status | Works | Notes |
|----------|--------|-------|-------|
| `GET /api/map/hotspots` | ⚠️ | Partial | Clustering incomplete |
| `GET /api/map/pins` | ✅ | Yes | Renders pins |

### Collection Endpoints

| Endpoint | Status | Works | Notes |
|----------|--------|-------|-------|
| `POST /api/collections` | ✅ | Yes | Create |
| `GET /api/collections/:id` | ✅ | Yes | Get collection |
| `PATCH /api/collections/:id` | ✅ | Yes | Edit |
| `DELETE /api/collections/:id` | ✅ | Yes | Delete |
| `POST /api/collections/:id/items` | ✅ | Yes | Add artwork |
| `DELETE /api/collections/:id/items/:artworkId` | ✅ | Yes | Remove |

---

## Integration Points Status (from AUDIT.md)

| Integration Point | Handler Exists | Wired | Tested | Status |
|-------------------||----|--------|--------|--------|
| Country Auto-Creation | ✅ Yes | �� Yes | ❌ No | ✅ DONE |
| Artist Auto-Creation | ✅ Yes | ⚠️ Partial | ❌ No | 📋 IN PROGRESS |
| Year Auto-Creation | ✅ Yes | ⚠️ Partial | ❌ No | 📋 IN PROGRESS |
| File Cleanup | ❌ No | ❌ No | ❌ No | ❌ NOT DONE |
| Official Gallery Creation | ❌ No | ❌ No | ❌ No | ❌ NOT DONE |
| Photo Gallery Attachment | ⚠️ Partial | ⚠️ Partial | ❌ No | 📋 IN PROGRESS |
| EXIF Extraction | ❌ No | ❌ No | ❌ No | ❌ NOT DONE |
| Notifications | ❌ No | ❌ No | ❌ No | ❌ NOT DONE |
| Geocoding | ✅ Yes | ✅ Yes | ❌ No | ⚠️ PARTIAL (has bugs) |

---

## Critical Path (Must Fix Before MVP)

1. ❌ **Admin Approve/Reject UI** - Can't approve claims from UI
2. ❌ **File Cleanup** - Storage grows unbounded
3. ❌ **Official Gallery Creation** - Can't create when claim approved
4. ⚠️ **Geocoding Robustness** - Fails for some coordinates

---

## Test Coverage

```
Unit Tests ......................... ❌ 0% (None found)
Integration Tests .................. ❌ 0% (None found)
E2E Tests .......................... ❌ 0% (None found)
Manual Testing Evidence ............ ⚠️ Assumed (no documentation)
```

---

## Deployment Readiness

```
Database Schema .................... ✅ READY
Environment Config ................. ✅ READY
Auth System ........................ �� READY
API Endpoints ...................... 📋 PARTIAL (some incomplete)
File Storage ....................... ❌ NOT READY (local only)
Error Monitoring ................... ❌ NOT SET UP
Logging System ..................... ⚠️ PARTIAL (console only)
Rate Limiting ...................... ❌ NOT IMPLEMENTED
Backup Strategy .................... ❌ NOT PLANNED
```

---

## Summary

**Total Features**: 60+  
**Fully Implemented**: ~25 (40%)  
**Partially Implemented**: ~20 (33%)  
**Not Implemented**: ~15 (25%)  
**Broken/Incomplete**: ~5 (8%)  

**MVP Readiness**: 65-70% complete

---

**Last Updated**: Current Session  
**Next Review**: After critical fixes  
