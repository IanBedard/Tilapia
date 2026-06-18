# Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Set:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The app stores users in `app_users` and fishing spots in `fishing_pins`.
Ratings, comments, and image gallery entries are stored as JSON on each pin for this starter version.

The current RLS policies are intentionally open for prototype development. Tighten them before production.

## Netlify Environment Variables

When hosting on Netlify, add these in Site configuration > Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not commit real Supabase keys to the repository.
