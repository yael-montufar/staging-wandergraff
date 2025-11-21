# Artwork Page & Galleries Update - Conversation Summary

**Context:** Previous conversation covering scope definition, clarifications, and implementation planning for updating artwork pages with masonry galleries and local testing setup.

---

## Phase 1: Scope Discussion Initiation

**Key Features Identified:**
1. Create a masonry gallery for official photos (artist-curated)
2. Implement drag-and-drop editor for arranging images in masonry layout
3. Add a randomizer that generates different masonry layouts based on number of items
4. Display community gallery feed on the artwork page
5. Support loading more community photos with pagination

---

## Phase 2: Clarification Round

**Initial Questions Asked:**
1. Should the masonry layout be saved to the database (persist user's arrangement)?
2. When artists upload new official photos, do they automatically go to the gallery or need manual addition?
3. For the randomizer - should it be automatic when adding items, or should artists click a "shuffle layout" button?
4. What's the actual implementation scope:
   - Update artwork detail page to show new gallery layouts?
   - Create separate editor page for masonry?
   - Both on same page or different pages?

---

## Phase 3: Scope Narrowing & Decisions

**Key Decisions Made:**

### Official Gallery Editor
- **Location:** Separate page (not embedded in dashboard)
- **Manual Management:** Artists manually add/arrange photos (not automatic entry)
- **Persistence:** Layout should be saved to database when user confirms arrangement
- **Shuffle Button:** Available to artists to regenerate layout options

### Masonry Pattern Behavior
- **Direction:** Expands horizontally when needed with repeating masonry pattern that scrolls
- **Storage:** Store image order (sequence), not x/y coordinates
- **Algorithm:** Masonry layout generated on-the-fly based on image order + preset layout pattern
- **Presets:** 3-5 seeded layout presets (e.g., "2-col tall, 1-col short, 2-col tall")

### Mobile Behavior
- **Mobile Editor:** Stacked vertical list with sort button, shows numbered positions
- **Mobile Display:** Positions shown reflect the masonry arrangement on larger screens

### Artwork Detail Page
- **Both Galleries Displayed:** Official gallery (if claimed AND published) + Community gallery with load more
- **Community Feed:** Shows other users' photos of the same artwork with pagination

---

## Phase 4: Implementation Planning

**Agreed Architecture:**

1. **Masonry Layout Utility**
   - Core layout algorithm using order + preset pattern
   - Generate positions on-the-fly based on image sequence

2. **Components Needed**
   - Masonry editor component with drag-and-drop
   - Masonry gallery display component
   - Community gallery/feed component with load more

3. **Database Schema Changes**
   - Store image order in official gallery
   - Reference preset layout pattern used
   - Community photos linked to artwork

4. **Routes/Pages**
   - Separate editor page for official gallery management
   - Updated artwork detail page integrating both galleries

---

## Phase 5: Local Development & Testing

**Context Switch to Local Testing:**

**Current Local Setup:**
- Local Docker PostgreSQL on `127.0.0.1:54322`
- Local Supabase Studio on `127.0.0.1:54321`
- Two environment files:
  - `.env.development.ref`: Uses Docker hostname `supabase:5432` (for Docker container networking)
  - `.env.tmp`: Uses localhost `127.0.0.1` (for direct machine access)

**Local Development Approach:**
- Use Docker for PostgreSQL and Supabase Studio locally
- Hybrid model: Local Docker database + Cloud Supabase Auth

**Next Steps Discussed:**
1. Copy `.env.tmp` content into `.env` to switch to local Docker setup
2. Ensure Docker is running with Supabase
3. Run the dev server
4. Run database migrations locally

---

## Docker in Docker Consideration

**Context:** User was running in a containerized environment (Builder.io cloud development environment)

**Docker Strategy for Testing:**
- **Option 1 (Recommended):** Install Docker Desktop on the machine for traditional local development
- **Option 2 (Complex):** Set up Docker in Docker (DinD) if running in a container to run Supabase locally
- **Option 3 (Simplest):** Use remote Supabase instance already configured in `.env`

**Chosen Approach:** Use local Docker PostgreSQL with .env.tmp configuration for faster iteration

---

## Summary of Conversation Range

- **Scope Discussion Start:** Feature identification and requirement gathering for masonry galleries
- **Clarification Questions:** Multiple rounds to narrow down implementation details
- **Decision Point:** Finalized architecture for Official Gallery Editor, masonry pattern, and artwork detail page integration
- **Implementation Phase:** Building masonry layout utility, components, and routes
- **Transition Point:** Shifted to local testing setup and Docker configuration for development

---

## Files Likely Impacted

- `prisma/schema.prisma` - Schema updates for gallery storage
- `app/routes/artwork.$id.tsx` - Artwork detail page integration
- `app/components/` - New masonry editor and gallery display components
- `.env`, `.env.tmp`, `.env.development.ref` - Environment configuration
- API routes for community gallery pagination

---

## Current Status

**At End of Conversation:**
- Architecture and scope finalized
- Local testing environment configured with Docker
- Ready to implement masonry gallery features on artwork page
- Plans to test locally using Docker PostgreSQL setup
