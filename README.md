# Gentle Sprouts Academy — Parent Portal

Lightweight parent engagement portal for evening classes at Kidz Safari. Teachers log sessions with notes and photos; parents open a magic-link page per child.

## Quick start

1. **Start Postgres** (Docker maps to host port `5436`):

```bash
npm run db:up
```

2. **Copy env and fill S3 credentials**:

```bash
cp .env.example .env
# Edit .env — paste your S3 bucket keys and S3_PUBLIC_BASE_URL
```

3. **Migrate** (no automatic seed data):

```bash
npm run db:migrate
```

4. **Run the app**:

```bash
npm run dev
```

- Home: http://localhost:3000  
- Teacher desk: http://localhost:3000/admin (PIN from `TEACHER_PIN`, default `1234`)  
- Add real students under `/admin/students`, then copy each child’s magic link  
  (readable form: `/s/{name}-{8-char-token}` — only the token authenticates)  
- Create leap types from `/admin/milestones` as needed (or `npm run db:seed:leaps` for optional templates)

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:up` | Start Docker Postgres |
| `npm run db:down` | Stop Docker Postgres |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | No-op by default (requires explicit flags) |
| `npm run db:seed:leaps` | Optional — upsert leap-type templates |
| `npm run db:seed:demo` | Dev only — add demo students |
| `npm run db:clear-students` | Wipe students, sessions, fees, media, and leap types |
| `npm run db:merge-sessions` | Merge duplicate sessions that share student + date |
| `npm run db:studio` | Open Prisma Studio |
# Kidz-Safari-Academy-
