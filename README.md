# supanextcn

A modern Next.js starter with Supabase, shadcn/ui, Tailwind CSS, TypeScript, and pnpm.

## Use This Template

Create a new app from this starter:

```bash
pnpm dlx create-next-app@latest my-app -e https://github.com/jhonejhee/supanextcn
cd my-app
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js
- React
- TypeScript
- Supabase
- shadcn/ui
- Tailwind CSS
- pnpm

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

You can find these values in your Supabase project settings.

## Supabase

This starter is intended for apps that use one Supabase project for:

- Auth
- Database
- Storage

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## Credits

Based on the official Next.js `with-supabase` example.

## License

MIT
