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
- `app/components/Intro.tsx` - assembles the intro sentence
- `app/components/TactileWord.tsx` - shared physical base: semantic button,
  press compression (spring), focus, reduced-motion
- `app/components/InferenceWord.tsx` - signature object: word becomes a tiny
  inference machine (dim + tighten, scan pass, characters resolve, result
  pulse)
- `app/components/UCSDWord.tsx` - object: mini identity badge (navy plaque,
  paper type, gold rule, tiny trident)
- `app/components/BasketballWord.tsx` - object: ball with mass (drop, squash,
  rebound, settle)
- `app/globals.css` - tokens + shared interaction CSS

Only the intro island is client JS (`motion/react`); everything else is
server/static.

## Deployment

`main` deploys to Vercel; production domain is https://skx.si (DNS lives at
Hostinger). No special config; the build is fully static.