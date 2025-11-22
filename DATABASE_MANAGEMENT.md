# Database Management Guide - Staging

## Quick Reference

### Blank Slate Commands

```bash
# Completely wipe database and reset migrations
npm run db:wipe

# Apply all migrations (after wipe, or fresh database)
npm run db:migrate

# Seed with demo data
npm run db:seed

# Reset to fresh state with full seed (wipe + migrate + seed in one)
npm run db:reset
```

---

## Part 1: Understanding Your Database Setup

**Database:** Neon Serverless PostgreSQL (staging)  
**Location:** Connected via `.env` DATABASE_URL  
**ORM:** Prisma  
**Migration Tool:** Prisma Migrate  

---

## Part 2: Blank Slate Steps (No Demo Data)

Use this flow when testing with a clean database.

### Step 1: Verify You're On Staging Database

```bash
grep DATABASE_URL .env | grep neon.tech
```

✅ Should show: `postgresql://neondb_owner:...@ep-billowing-darkness...neon.tech`

If it shows `127.0.0.1` or `localhost`, you're on local development database. Switch to staging:

```bash
cat .env.staging.ref > .env
```

### Step 2: Wipe the Database (Delete All Data)

```bash
npm run db:wipe
```

**What this does:**
- Reads `prisma/wipe.ts`
- Deletes all tables in order (respecting foreign key constraints)
- Keeps schema intact, resets database to empty state
- Takes ~5-10 seconds

**Expected output:**
```
Wiping database tables in order...
✓ Deleted 0 collection items
✓ Deleted 0 follows
✓ Deleted 0 saves
✓ Deleted 0 gallery photos
✓ Deleted 0 galleries
✓ Deleted 0 photos
✓ Deleted 0 collections
✓ Deleted 0 artworks
✓ Deleted 0 users
✓ Deleted 0 artists
✓ Deleted 0 countries
✓ Deleted 0 artwork years
✓ Wipe complete!
```

### Step 3: Apply Migrations

```bash
npm run db:migrate
```

**What this does:**
- Reads migrations from `prisma/migrations/`
- Applies any unapplied migrations
- Creates all tables with current schema
- Idempotent (safe to run multiple times)

**Expected output:**
```
Prisma Migrate applied the following migration(s):
  migrations/
    - 20250101000000_init/migration.sql
    - 20250101000001_add_galleries/migration.sql
    ... (6 total)
```

### Step 4: Verify Schema with Prisma Studio

```bash
npx prisma studio
```

Browser opens at `http://localhost:5555` showing:
- ✅ All tables present (User, Artwork, Photo, Gallery, etc.)
- ✅ No data in any tables
- ✅ Schema structure matches `prisma/schema.prisma`

**Close browser tab when done** (Prisma Studio will keep running)

### Step 5: You're Ready for Testing!

You now have a completely blank slate:
- No users
- No artworks
- No photos
- No galleries

**Next:** Sign up via Google OAuth and manually test the user journey.

---

## Part 3: Adding Seed Data

Use this when you're ready to populate staging with demo content.

### Manual Seeding Flow

```bash
npm run db:seed
```

**What this does:**
- Clears all data (same as `db:wipe`)
- Creates test users (admin, artists, regular users)
- Creates claimed artworks with official galleries
- Creates photos with proper gallery orderings
- Populates country/year/artist browse records
- Sets some galleries as published for visibility

**Expected output:**
```
🌱 Starting database seed...
🗑️ Clearing existing data...
👥 Creating users...
  ✓ Admin: admin@wandergraff.local
  ✓ Artists: 4 created
  ✓ Regular users: 3 created
🎨 Creating artworks...
  ✓ Unclaimed: 3
  ✓ Claimed: 4
  ✓ Total: 7
📸 Creating photos...
  ✓ Photos created: 32 (with gallery orderings)
🎯 Creating browse records...
  ✓ Artists: 4
  ✓ Countries: 4
  ✓ Years: 3
✨ Seed complete!
```

### What Gets Created

**Users:**
- 1 Admin (`admin@wandergraff.local`)
- 4 Artists (with different activity levels)
- 3 Regular users (photographers/explorers)

**Artworks:**
- 3 Unclaimed artworks (community photos only)
- 4 Claimed artworks with official galleries
  - Each has 8-10 photos
  - Gallery order properly set in `galleryImageOrder`
  - Layout preset randomly assigned
  - Gallery published and visible

**Photos:**
- 32 total photos
- 24 in official galleries (from gallery orderings)
- 8 in community galleries (unclaimed artworks)

**Browse Data:**
- 4 Artist records (for /artists page)
- 4 Country records (for /countries page)
- 3 Year records (for /years page)

---

## Part 4: Working Workflow

### Testing New Features (Requires Fresh Start)

```bash
# 1. Switch to staging database (if needed)
cat .env.staging.ref > .env

# 2. Get clean database
npm run db:wipe
npm run db:migrate

# 3. Test manually or seed if needed
npm run db:seed

# 4. Test your feature
# (visit staging Vercel URL)

# 5. If you find bugs, wipe and test again
npm run db:wipe
npm run db:migrate
npm run db:seed
```

### Recovering from Bad State

If database gets corrupted or migrations fail:

```bash
# Option 1: Full reset (clears everything)
npm run db:reset

# Option 2: Manual recovery
npm run db:wipe
npm run db:migrate
# Then manually debug or seed
```

---

## Part 5: Environment Switching

### Local Development → Staging

```bash
# Save local dev config (if not already saved)
cp .env .env.local-dev

# Switch to staging
cat .env.staging.ref > .env

# Run commands against staging
npm run db:migrate
npm run db:seed
```

### Staging → Local Development

```bash
# Switch back to local dev
cp .env.local-dev .env

# Or use the reference
cat .env.development.ref > .env

# Local dev should use docker-in-docker PostgreSQL
npm run dev
```

---

## Part 6: Troubleshooting

### "Connection timeout" Error

```bash
# Verify correct database URL
cat .env | grep DATABASE_URL
```

Check that URL contains:
- ✅ `neon.tech` (for staging)
- ✅ `pooler` endpoint (for connection pooling)
- ✅ `?channel_binding=require&sslmode=require`

### "EACCES: permission denied" on Wipe

```bash
# Ensure you have permissions on the directory
sudo npm run db:wipe

# Or ensure NODE_ENV is set
NODE_ENV=production npm run db:wipe
```

### Migration Already Applied Error

This is fine - migrations are idempotent. Just run again:

```bash
npm run db:migrate
```

### Prisma Studio Can't Connect

```bash
# Kill any existing Prisma Studio processes
pkill -f "prisma studio"

# Try again
npx prisma studio
```

---

## Part 7: Understanding the Script Commands

### `npm run db:wipe`

**File:** `prisma/wipe.ts`

Deletes all data from all tables in proper order:
1. CollectionItem (references Collection, Artwork)
2. Follow (references User)
3. Save (references User, Artwork)
4. GalleryPhoto (references Gallery, Photo)
5. Gallery (references Artwork)
6. Photo (references Artwork, User)
7. Collection (references User)
8. Artwork (references User, Country)
9. User
10. Artist
11. Country
12. ArtworkYear

**Safe to run multiple times** - checks if data exists first.

### `npm run db:migrate`

**File:** `prisma/schema.prisma`

Reads all migrations and applies unapplied ones:
- `prisma/migrations/*/migration.sql`
- Currently 6 migrations tracked
- Idempotent (won't re-apply already applied migrations)

**Safe to run multiple times** - Prisma tracks applied migrations.

### `npm run db:seed`

**File:** `prisma/seed.ts`

1. Clears data (same as wipe)
2. Creates test users
3. Creates test artworks
4. Creates test photos with gallery orderings
5. Sets up browse records

**Useful for:** Demo data, testing features, staging reviews

### `npm run db:reset`

**Runs:** `db:wipe` → `db:migrate` → `db:seed`

All in one command. Useful for:
- Fresh development start
- Testing after schema changes
- Preparing for demos

---

## Part 8: Reference Tables

### Available Test Accounts (After Seed)

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| `admin@wandergraff.local` | Via OAuth | ADMIN | Can view admin dashboard |
| `artist1@wandergraff.local` | Via OAuth | ARTIST | Has claimed artwork with gallery |
| `artist2@wandergraff.local` | Via OAuth | ARTIST | Has claimed artwork with gallery |
| `explorer1@wandergraff.local` | Via OAuth | REGULAR_USER | Can upload photos, create collections |

Note: After seed, use Google OAuth to sign in (local test accounts use OAuth flow).

### Database Statistics (After Seed)

- Users: 8
- Artworks: 7 (3 unclaimed, 4 claimed)
- Photos: 32 (24 in official galleries, 8 in community)
- Countries: 4
- Years: 3
- Artists (browse): 4
- Collections: 4
- Galleries: 4 (official galleries)

---

## Part 9: Admin User Management & Claims Approval

### Creating Admin Users

Admin users are required to:
- Access the admin dashboard
- Approve/reject artist claims
- Delete incorrect artwork pins
- Manage platform content

### Method 1: Create Admin During Seeding

The seed script creates an admin user automatically:

```bash
npm run db:seed
```

Default admin account (after seed):
- **Email:** `admin@wandergraff.local`
- **Role:** ADMIN
- **Password:** Use Google OAuth to sign in

### Method 2: Create Admin via CLI (Recommended)

**New! Easy npm command to create admin users:**

#### Interactive Mode (Prompts for Input)

```bash
npm run admin:create
```

**Output:**
```
╔════════════════════════════════════════════╗
║         Create Admin User                  ║
╚════════════════════════════════════════════╝

📋 Interactive Mode

Enter admin email: yael@wandergraff.com
Enter admin name: Yael Montufar

🔐 Creating admin user...
   Email: yael@wandergraff.com
   Name: Yael Montufar
   Role: ADMIN

✅ Admin user created successfully!

📝 User Details:
   ID: clh8g7s9f0000h7k8g9j0k1l2
   Email: yael@wandergraff.com
   Name: Yael Montufar
   Role: ADMIN
   Created: Dec 21, 2025, 2:34 PM

🔑 Authentication:
   - Use Google OAuth to sign in
   - Visit: http://localhost:5173/auth/login
   - Email: yael@wandergraff.com

📊 Next Steps:
   1. Sign in with Google OAuth
   2. Navigate to /admin/dashboard
   3. Approve/reject pending artwork claims
```

#### Command-Line Arguments (Non-Interactive)

**Create admin with flags:**

```bash
npm run admin:create -- --email admin@example.com --name "Admin Name"
```

**Multiple admins:**

```bash
npm run admin:create -- --email admin1@wandergraff.com --name "Yael Montufar"
npm run admin:create -- --email admin2@wandergraff.com --name "Second Admin"
```

**Upgrade existing user to admin:**

```bash
# If user already exists, they'll be upgraded to ADMIN role
npm run admin:create -- --email explorer1@wandergraff.local --name "Alex Chen"
```

### Method 3: Manually Create Admin User (Prisma Studio)

If you prefer the GUI approach:

```bash
# Open Prisma Studio
npx prisma studio

# Then:
# 1. Go to "User" table
# 2. Click "Add record" button
# 3. Fill in:
#    - email: admin2@wandergraff.local
#    - name: Admin User 2
#    - role: ADMIN
# 4. Click "Save"
```

### Method 4: Create Admin via Raw SQL

If you prefer raw SQL:

```bash
# Connect to your database
psql $DATABASE_URL

# Then run:
INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin2@wandergraff.local',
  'Admin User 2',
  'ADMIN',
  NOW(),
  NOW()
);
```

### Accessing Admin Dashboard

**Route:** `/admin/dashboard`

**Workflow:**
1. Sign in with admin account (Google OAuth)
2. Navigate to `/admin/dashboard`
3. View all artworks with their claim statuses

**Auto-redirect for non-admins:** If non-admin users try to access `/admin/dashboard`, they're automatically redirected to home page.

---

### Understanding Claim Statuses

**UNCLAIMED** (gray badge)
- Artwork pinned by community member
- No artist has claimed it yet
- Visible to everyone

**PENDING_APPROVAL** (yellow badge)
- Artist submitted a claim
- Only visible to: the claiming artist + admins
- Waiting for admin verification
- Artist sees: "Pending Admin Review" with claim count (X/3)

**CLAIMED** (green badge)
- Admin approved the claim
- Artist can now:
  - Edit artwork title, description, year
  - Create official gallery
  - Upload and curate photos
- Visible to everyone with artist credit

---

### Approving Artist Claims

#### Step 1: Access Admin Dashboard

```
1. Sign in as admin (admin@wandergraff.local)
2. Navigate to /admin/dashboard
3. You'll see all artworks organized by status
```

#### Step 2: Find Pending Claims

**In admin dashboard:**
- Use **"Claim Status"** filter dropdown
- Select **"Pending Approval"**
- This shows only artworks waiting for your approval

#### Step 3: Review Claim Details

Each pending claim shows:
- Artwork title and location
- Photo preview (if available)
- Artist name and contact info (on right sidebar)
- Claim date/status

#### Step 4: Approve the Claim

**In the artwork card:**
1. Click **"✓ Approve"** button (green)
2. Confirmation modal appears asking "Approve this claim?"
3. Click **"Confirm"** to approve

**What happens after approval:**
- Claim status changes to CLAIMED
- Artwork appears with "Claimed by Artist" badge
- Artist can now edit metadata and create gallery
- Official gallery (if created) becomes visible

#### Step 5: Reject the Claim (If Needed)

If the claim is invalid or disputed:

1. Click **"✕ Reject"** button (orange)
2. Confirmation modal appears with message:
   - "This claim will be rejected"
   - "Artist can re-submit after 2 weeks"
3. Click **"Confirm"** to reject

**What happens after rejection:**
- Claim status returns to UNCLAIMED
- Artwork shows as unclaimed again
- Artist is placed on 2-week cooldown
- Artist can re-submit claim after cooldown expires

---

### Admin Dashboard Features

#### Search Artworks

**By title, address, or artist:**
```
1. Enter search term in search box
2. Hit Enter or click search
3. Results filter in real-time
```

#### Filter by Status

**Dropdown options:**
- **All Statuses** - Show all artworks
- **Unclaimed** - Community pins, no claims
- **Pending Approval** - Waiting for admin decision
- **Claimed** - Approved claims (already processed)

#### Pagination

- Shows 20 artworks per page
- Click pagination buttons to navigate
- Search and filters maintain across pages

#### View Artist Directory

**Right sidebar shows:**
- All registered artists (users with ARTIST role)
- Artist contact information:
  - Email
  - Instagram handle
  - Twitter handle
  - Website/portfolio URL
  - Bio

**Use this to:**
- Verify artist identity before approving
- Contact artist directly if claim looks suspicious
- See artist portfolio/social media

---

### Claim Approval Workflow (Full Process)

```
1. Artist signs up (role: REGULAR_USER by default)
   ↓
2. Artist clicks "Become an Artist"
   - Provides artist name + optional contact info
   - Role changes to ARTIST
   ↓
3. Artist finds artwork they created
   - Clicks "Claim This Artwork"
   - Artwork status: PENDING_APPROVAL
   - Artist sees "Pending Admin Review" + count (1/3)
   ↓
4. Admin reviews claim in admin dashboard
   - Filters to "Pending Approval"
   - Views artist contact info in sidebar
   - Verifies claim legitimacy
   ↓
5. Admin approves or rejects
   - ✓ APPROVE → Artwork becomes CLAIMED, artist can edit/curate
   - ✕ REJECT → Artwork returns to UNCLAIMED, 2-week cooldown on artist
   ↓
6. If approved:
   - Artist now owns the artwork
   - Can edit: title, description, year
   - Can create official gallery with drag-and-drop curation
   - Photos become visible in official gallery (if published)
```

---

### Claim Rate Limiting

**Artists can have maximum 3 open/pending claims at once**

Example:
- Artist submits claim #1 (PENDING_APPROVAL)
- Artist submits claim #2 (PENDING_APPROVAL)
- Artist submits claim #3 (PENDING_APPROVAL)
- Attempt to submit claim #4 → Error: "You have 3 pending claims. Complete or withdraw one."

**To free up claim slots:**
- ✓ Get admin approval for one claim → frees 1 slot
- ✓ Withdraw a pending claim manually → frees 1 slot immediately

---

### Testing Claim Approval Flow

#### Manual Testing (Blank Slate)

```bash
# 1. Get blank database
npm run db:wipe && npm run db:migrate

# 2. Sign up as regular user (Google OAuth)
# 3. Pin an artwork
# 4. Change role to ARTIST (in /user/profile)
# 5. Claim the artwork → status: PENDING_APPROVAL
# 6. Sign out, sign in as admin
# 7. Go to /admin/dashboard
# 8. Filter by "Pending Approval"
# 9. Click "✓ Approve"
# 10. Verify status changed to CLAIMED
```

#### Testing with Seeded Data

```bash
# 1. Run seed (includes 4 claimed artworks)
npm run db:seed

# 2. Manually create pending claims:
#    - Sign in as artist
#    - Pin new artwork
#    - Claim it (status: PENDING_APPROVAL)

# 3. Admin dashboard will show:
#    - 4 CLAIMED artworks (from seed)
#    - 1+ PENDING_APPROVAL (your test claim)

# 4. Test approval workflow
```

---

### Troubleshooting Admin Access

#### "Not authorized to view admin dashboard"

You're not signed in as admin:
1. Sign out
2. Sign in with admin account: `admin@wandergraff.local`
3. Use Google OAuth to authenticate

#### "Approve button not working"

Possible issues:
- Artwork status is not PENDING_APPROVAL
- You're not an admin
- Try refreshing the page

**Check artwork status:**
```bash
# In Prisma Studio
npx prisma studio
# Go to Artwork table
# Filter by "claimStatus = PENDING_APPROVAL"
```

#### Admin account doesn't exist

Create it:
```bash
npx prisma studio
# User table → Add record
# Fill: email, name (any), role: "ADMIN"
```

---

## Part 10: Next Steps

- [ ] Run `npm run db:seed` to create admin account
- [ ] Sign in with admin account (`admin@wandergraff.local`)
- [ ] Test admin dashboard at `/admin/dashboard`
- [ ] Have an artist create a pending claim (manual test)
- [ ] Practice approving and rejecting claims
- [ ] Create additional admin accounts if needed
- [ ] Document your claim approval SOP (standard operating procedure)

---

## Need Help?

**For connection issues:** Verify DATABASE_URL in `.env`
**For migration errors:** Check `prisma/migrations/` directory
**For seed issues:** Check `prisma/seed.ts` for data validation
**For schema questions:** Reference `prisma/schema.prisma`
**For admin access:** Verify user role is ADMIN in Prisma Studio
**For claim approval:** Check admin dashboard at `/admin/dashboard`
