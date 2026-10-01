# Siddhant Kuwar

Personal website. One page, static, no database, no CMS.

## Stack

- Next.js (App Router, static rendering)
- TypeScript
- Tailwind CSS v4
- Geist (self-hosted via `next/font`)

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint   # ESLint
npx tsc --noEmit   # typecheck
npm run build  # production build (static output)
```

## Content

All page content lives in `app/page.tsx` (constants at the top of the file).

- `Resume` links to `/resume.pdf`; drop a PDF named `resume.pdf` into `public/`.
- Project links point to their real GitHub/production URLs.

## Deployment

The `main` branch deploys to Vercel at https://skx.si (and the `vercel.app`
preview URL). No special config needed; the build is fully static.