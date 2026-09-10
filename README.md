# SRCS — Student Result Compilation and Scaling System (Backend)

A NestJS + Prisma + Supabase backend for compiling student results across
multiple assessment tables, matching records, applying approved score-scaling
rules, assigning grades, and exporting final result sheets — with a full,
immutable audit trail. Implements the SRCS PRD (v1.0).

## Tech stack

- **NestJS 10** (modular monolith) with class-based DI
- **Prisma 5** ORM over **Supabase PostgreSQL**
- **Zod** for runtime validation *and* as the single source of truth for types
- **SheetJS (`xlsx`)** for parsing/auditing/writing Excel score tables
- **pdfkit** for PDF result sheets
- **JWT** auth with role-based access control (Lecturer / Admin)

## Project structure

```
src/
  core/            Framework-free, pure, unit-tested domain logic
    xlsx/          Workbook parsing, column mapping, result writer
    audit/         Upload auditor (duplicate & validation detection)
    matching/      Reg-no -> UTME -> name+dept record matching
    compilation/   Merge components into totals
    scaling/       Range / fixed-bonus / percentage scaling
    grading/       Grade assignment from a scale
    statistics/    Pass-fail rates, distribution, scaling preview
    pdf/           PDF result generation
  schemas/         Zod schemas + inferred types (the type source of truth)
  common/          Config, Zod pipe, Prisma service, auth guards, filters
  modules/         Feature modules (controller + service + module each)
    auth  users  departments  students  courses  grading
    scores  compilation  scaling  reporting  export  audit
prisma/
  schema.prisma    Full data model
  seed.ts          Bootstrap admin + default grading scale
test/
  core.spec.ts     Unit tests for the core logic
```

The **core** layer knows nothing about NestJS, HTTP, or Prisma — it is pure
functions over plain data, which is why it is fully unit-tested. Feature
services orchestrate the core logic and persistence.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env       # then edit DATABASE_URL / JWT_SECRET

# 3. Start Supabase locally (or point DATABASE_URL at your project)
npx supabase start

# 4. Generate the Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# 5. Seed a starter admin + default grading scale
npm run db:seed            # admin@srcs.local / admin12345

# 6. Run
npm run start:dev          # http://localhost:3000/api
```

## Score-upload flow (the heart of the system)

`POST /api/courses/:courseId/scores/upload?assessmentType=TEST` with a
multipart `file` field (an `.xlsx`, `.xls`, or `.csv`).

1. **Parse** — SheetJS reads the sheet; headers like `Reg No`, `Matric Number`
   are mapped to canonical fields automatically.
2. **Audit** — the upload auditor reports every problem before anything is
   imported: duplicate registration numbers, duplicate UTME numbers, duplicate
   name+department, identical rows, missing columns, missing/invalid/out-of-range
   scores. Duplicate registration/UTME numbers **block** the import.
3. **Match** — each row is matched to a student by registration number, then
   UTME number, then name + department (fallback).
4. **Preview or commit** — the request is a **dry run by default**, returning
   the audit report and a per-row match preview. Add `&commit=true` to import
   the rows that passed validation.

## Scaling (transparent & reproducible)

Scaling rules are **stored, not baked into the raw scores**. Raw scores stay
immutable; compilation re-applies the approved rules every time, so a result is
always reproducible from `raw scores + stored formulas` (PRD §7.2). Every
scaling action requires an **approval reference** (enforced by the schema) and
is written to the audit trail.

- `POST /api/courses/:id/scaling/preview` — before/after pass-rate & grade shift
- `POST /api/courses/:id/scaling/apply` — persist + recompile

## Key endpoints

| Method | Path | Role | Purpose |
|-------:|------|------|---------|
| POST | `/api/auth/register` | public | Register (pending approval) |
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET  | `/api/users` | admin | List / approve accounts |
| CRUD | `/api/departments` `/api/courses` `/api/students` | admin | Records |
| POST | `/api/grading-scales` | admin | Configure grade bands |
| POST | `/api/courses/:id/scores/upload` | lecturer/admin | Upload score table |
| PATCH| `/api/courses/:id/scores/:scoreId` | lecturer/admin | Edit a score (reason required) |
| POST | `/api/courses/:id/compile` | lecturer/admin | Compile & match |
| POST | `/api/courses/:id/scaling/preview` \| `/apply` | lecturer/admin | Scaling |
| GET  | `/api/courses/:id/summary` | lecturer/admin | Statistics |
| GET  | `/api/courses/:id/export/xlsx` \| `/pdf` | lecturer/admin | Export |
| GET  | `/api/audit` | admin | Full audit trail |

## Testing

```bash
npm test          # unit tests for the core domain logic
npm run test:e2e  # boots the app (needs a test DB + .env)
```

## Notes

- The permission matrix (PRD §3.3) is enforced by `JwtAuthGuard` + `RolesGuard`
  and a per-course ownership check (`CoursesService.assertCanManage`).
- The audit trail is append-only: the service exposes no update/delete.
