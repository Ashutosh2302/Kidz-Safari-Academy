# Gentle Sprouts Academy — Parent Portal Build Plan

## Project Summary
A lightweight, web-based parent engagement portal for Gentle Sprouts Academy (evening classes at Kidz Safari). No app, no login friction — parents get a magic-link page per child showing daily activity, photos, milestones, and weekly progress. Teacher logs sessions from a simple mobile-friendly form after each class.

**Goal:** Make parents feel informed and like they're getting clear value for the fee, with minimal ongoing effort from the teacher.

---

## Tech Stack
- **One repo, one app:** Next.js (App Router) for everything — UI pages + API routes/Server Actions as the backend. No separate NestJS service for this project; it's small enough that splitting frontend/backend adds overhead without benefit.
- **Database:** PostgreSQL, accessed via Prisma (fast to scaffold, good with Next.js API routes/Server Actions)
- **Styling:** Tailwind CSS
- **Image storage:** Cloudflare R2 (S3-compatible, cheap) — upload via Next.js API route, store URL in DB
- **Auth:** None for parents (magic-link token per child). Simple password/PIN check in a Server Action for teacher admin — no auth library needed at this scale.
- **Notifications (Phase 3+):** WhatsApp via a provider like Gupshup/Interakt, called from a Next.js API route
- **Hosting:** Vercel (frontend + API routes together) + a managed Postgres (Supabase/Neon/Railway) — one deploy, minimal ops

This keeps the whole thing as a single Turborepo-free, single Next.js app — simplest possible setup for a Phase-0 test. If it grows into something you sell to other schools, splitting out a real backend later is easy since the data layer (Prisma) is already isolated.

---

## Design Language — Cursor Prompt (paste this directly)

The portal must match the visual identity of the Kidz Safari / Gentle Sprouts family site (kidzsafari.in) — a **safari/jungle-themed, Waldorf-inspired** preschool brand, not a generic pastel preschool template. Give Cursor this whole block verbatim before generating any UI:

```
Design this like the Kidz Safari brand (kidzsafari.in) — a safari/jungle-themed,
Waldorf-inspired preschool. Match this exact visual identity:

THEME: Safari/jungle explorer, not generic "cute preschool." Think tiny steps to
giant leaps — journeys, growth, exploration. Use safari animals (giraffe 🦒, lion 🦁,
tiger 🐯, monkey 🐵, elephant) as recurring motifs, not random cartoon icons.

COLOR PALETTE:
- Warm sunny yellow/mustard as primary accent (buttons, highlights, badges)
- Cream / warm off-white as page background (never stark white or gray)
- Leaf green and sage as secondary accent (nature, growth, Waldorf feel)
- Terracotta/coral as a tertiary warm accent for callouts
- Deep warm brown for body text (not pure black)
- Sky blue used sparingly for variety in badges/tags
Avoid: corporate blue, purple gradients, neon colors, pure white/gray SaaS look.

TYPOGRAPHY:
- Headings: a big, rounded, friendly display font (Fredoka, Baloo 2, or similar) —
  should feel hand-lettered/storybook, matching headline style like
  "Where little explorers take their first big leaps"
- Body: clean warm sans-serif (Nunito, Quicksand) for readability
- Generous letter spacing on small labels/tags, bold and large on headlines

COPY TONE & DECORATIVE ELEMENTS:
- Warm, first-person-to-parent voice with light emoji use as decoration, not just icons
  — e.g. section headers styled like "A peek into our days 🌈" or "Tiny steps this week 🐾"
- Use safari/nature emoji strips as decorative dividers between sections
  (the way the site uses rows of 🦁🐯🐵🦓🦜🐢 or 🌻🌳🦋🐛🍎🌈 between sections)
- Rounded pill-shaped badges/tags for stats (e.g. "🏆 3 sessions this week")

LAYOUT & SHAPES:
- Fully rounded corners everywhere — cards, buttons, images, badges (border-radius
  should feel generous, 16-24px+, never sharp)
- Soft, warm-toned drop shadows, not harsh gray shadows
- Organic/blob-shaped background accents behind photo sections, not straight boxes
- Photo cards with slightly rounded, polaroid/scrapbook feel rather than clean grid tiles
- Icons should feel hand-drawn/illustrated (use emoji or rounded icon sets), not thin
  corporate line icons

MOTION:
- Gentle bounce/scale on hover and tap (buttons, badges, milestone unlocks)
- Soft fade/slide-in for photo timeline items as they load
- Nothing sharp, fast, or corporate — everything should feel soft and springy

REFERENCE FEEL: A storybook page crossed with a safari expedition journal — warm,
illustrated, celebratory — NOT an admin dashboard, NOT a generic SaaS parent portal
template.
```

Apply this to every parent-facing and teacher-facing page. If you have the actual brand hex codes from kidzsafari.in's stylesheet, paste them into the prompt above in place of the named colors before giving it to Cursor — that'll get you an exact match instead of a close one.

---

## Data Model (PostgreSQL via Prisma, inside the same Next.js repo)

```
students
- id, name, dob, parent_name, parent_phone, magic_link_token (unique), created_at

sessions
- id, student_id (FK), session_date, notes, created_by (teacher), created_at

session_photos
- id, session_id (FK), photo_url, caption, created_at

milestones
- id, name, category (e.g. "Rhymes", "Motor Skills", "Social"), icon, created_at

student_milestones
- id, student_id (FK), milestone_id (FK), achieved_date

attendance
- id, student_id (FK), date, status (present/absent), created_at
```

Keep it this simple for Phase 0-2. Don't over-normalize yet.

---

## Value Nudges (apply across the portal, not just attendance)
The core idea: don't just show data, reframe it so parents feel the value. Every nudge should answer "why does this hour matter" in one glance.

- **Screen-time-saved counter:** On the attendance grid, each attended session = "+1 hour of real-world play instead of screens." Show a running total for the term, e.g. "18 hours of screen-free play this term 🌱" with a small growing-plant visual that fills in as sessions accrue. This is the single most persuasive nudge for modern parents — it converts attendance from a checkbox into a tradeoff parents already care about.
- **Skill-in-action framing:** Instead of just "Present," tag each attended day with what happened — "Present — practiced sharing during circle time." Turns attendance from a binary into a story.
- **Comparative gentle nudge (not guilt):** If a child missed a session, don't shame — show what the class did, e.g. "The group explored color mixing today — [child] will catch up next session with a quick recap." Keeps it warm, not punitive.
- **Term-long growth arc:** A simple visual timeline showing milestone unlocks across the term (not just a list) — makes 8 weeks of ₹X fee visibly map to visible growth, not just childcare hours.
- **"Compare to a screen hour" microcopy:** Small contextual lines near photos/notes, e.g. "In the time it takes to watch 2 cartoon episodes, [child] built a tower, sang 3 songs, and made a new friend." Use sparingly — 1-2 per week, not on every card, or it gets preachy.
- **Consistency streaks (positive framing only):** "3 weeks in a row!" badge for regular attendance — gamifies consistency for the parent, not just the kid.

Keep all nudges warm and factual, never guilt-based or comparison-to-other-kids. The goal is "this hour was worth it," not "you're falling behind."

---

## Phase 0 — Foundation (Weekend 1)
**Goal:** Teacher can log a session; a parent can view it via a link. Nothing else.

- [ ] Set up NestJS backend with `students`, `sessions`, `session_photos` tables
- [ ] Seed 5-10 real students manually (from Aastha's actual class list)
- [ ] Build teacher admin page (no auth needed yet, or a single shared PIN):
  - Select student → add today's note + upload 1-3 photos → submit
- [ ] Build parent view page at `/s/[magic_link_token]`:
  - Shows student name, photo timeline (most recent first), notes
  - Apply full design language here — this is the page parents actually see
- [ ] Generate magic links, share manually via WhatsApp to parents for this pilot

**Success check:** Can Aastha log a real session after class in under 3 minutes on her phone? Do 2-3 parents actually open the link?

---

## Phase 1 — Make It Feel Alive (Weekend 2)
**Goal:** Add the pieces that make parents feel ongoing value, not just a one-time page.

- [ ] Attendance calendar view on parent page (simple month grid, colored dots) — implement the **screen-time-saved counter** and **consistency streak** nudges here (see Value Nudges section)
- [ ] Milestones table + seed with real Waldorf-style categories (Rhymes, Stories, Motor Skills, Social Play, Nature Circle — get actual categories from Aastha's curriculum)
- [ ] Teacher can mark milestones achieved per student
- [ ] Parent page shows milestone badges — playful icons, "unlocked" style with a little celebration animation
- [ ] Mobile responsiveness pass — most parents will open this on phone via WhatsApp link

**Success check:** Does the page feel like a "memory book" a parent would screenshot and share with grandparents?

---

## Phase 2 — Reduce Teacher Effort (Weekend 3)
**Goal:** Make the teacher-side sustainable long-term, not a chore.

- [ ] Bulk session logging — log the same note/photos to multiple students at once (whole-class activity) with option to add per-child notes
- [ ] Simple teacher login (PIN or basic auth) instead of open admin page
- [ ] Photo upload optimization — auto-compress/resize on upload (don't burn storage/bandwidth)
- [ ] Basic weekly digest — auto-generate a "this week" summary per student (just query last 7 days, no AI needed yet)

**Success check:** Can Aastha log an entire class session (all students) in under 5 minutes?

---

## Phase 3 — Distribution & Delight (Weekend 4+)
**Goal:** Increase perceived value and word-of-mouth.

- [ ] WhatsApp auto-send: when a session is logged, auto-message parent with a link + one-line summary (via Gupshup/Interakt API)
- [ ] Weekly PDF/report-style summary (auto-generated, downloadable — feels like a "report card")
- [ ] Shareable milestone cards (image export of a badge unlock, sized for WhatsApp status/Instagram — free organic marketing for the school)
- [ ] Simple public landing page for Gentle Sprouts Academy itself (about, curriculum, testimonials, enquiry form) — useful for enrolling new students

**Success check:** Are parents forwarding milestone cards or the weekly summary to family unprompted?

---

## What to Deliberately Skip (for now)
- Parent login/accounts — magic links are enough at this scale
- Native mobile app — WhatsApp + web link outperforms an app nobody installs
- Payment/fee tracking — separate concern, add later only if needed
- Multi-teacher roles/permissions — not needed until the school has staff beyond Aastha

---

## Notes for Cursor
- Single Next.js repo. Use API routes or Server Actions for all backend logic (session creation, photo upload, magic link resolution) — do not scaffold a separate backend service or Turborepo for this project.
- Use Prisma as the ORM against Postgres — keeps schema + migrations in one place inside the same repo.
- Build Phase 0 fully working end-to-end before touching Phase 1. Resist adding milestone/attendance logic early.
- Every parent-facing page must follow the Design Language Cursor Prompt above — treat it as a hard constraint, not a suggestion. If the current build doesn't look right, re-run that exact block as a dedicated prompt against existing components to restyle them, rather than describing the look freeform.
- Value Nudges (screen-time counter, streaks, etc.) get added in Phase 1 alongside attendance — don't build them into Phase 0.
- Keep the teacher-facing form dead simple — it will be used tired, after a real class, on a phone.
- No unnecessary auth complexity in Phase 0 — magic link tokens are enough for a pilot with ~10 students.