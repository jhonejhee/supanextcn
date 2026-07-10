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

During install, the starter asks whether you want to add a shadcn sidebar
block. Choose `No Sidebar` to keep the starter unchanged, or pick one of the
sidebar blocks to install it at `/dashboard`.

If your install runs without interactive prompts and prints a setup skipped
message, you can run the setup later:

```bash
pnpm setup:ui
```

After setup completes, either during install or from `pnpm setup:ui`, the
one-time setup helper removes itself from the generated project.

To choose again before setup has cleaned itself up, run:

```bash
pnpm setup:ui --force
```

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
pnpm test
```

## Credits

Based on the official Next.js `with-supabase` example.

## License

MIT
