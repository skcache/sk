# Siddhant Kuwar

Personal website. One page, text-first, static, no database, no CMS.

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
npm test       # anti-slop copy guard (copy, links, resume-absence)
npx tsc --noEmit   # typecheck
npm run build  # production build (static output)
```

## Structure

- `app/page.tsx` - page shell, content constants (experience, projects)
- `app/components/Intro.tsx` - the interactive intro sentence (only client
  component: click/tap/keyboard word interactions, reduced-motion aware)
- `app/globals.css` - tokens + interaction keyframes

## Deployment

`main` deploys to Vercel; production domain is https://skx.si (DNS lives at
Hostinger). No special config; the build is fully static.