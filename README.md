NEWS ACTION TV

Hindi news portal with JavaScript-backed public news and a Supabase-authenticated admin CMS.

## Supabase setup

The admin CMS fails closed until Supabase is configured. Admin credentials are
managed by Supabase Authentication; do not put passwords in this project.

1. Create a Supabase project.
2. In **Project Settings → API**, copy the **Project URL** and the
   **publishable key** (or legacy **anon/public key**). Put them in
   `assets/js/supabase-config.js`. These two values are public client
   credentials; never use a `service_role` or secret key in the website.
3. In the Supabase SQL Editor, run `supabase/setup.sql`.
4. In **Authentication → Settings**, disable public sign-ups. Create and
   verify only the `newsactiontv@gmail.com` user from the Supabase dashboard.
   Configure email/password authentication and email delivery as appropriate
   for the project.
5. Serve this directory over HTTP(S); ES modules do not work from a `file://`
   URL. For local development, run `python -m http.server 8000` here and open
   `http://localhost:8000/`.

The SQL migration applies row-level security to published news and the
`news-images` Storage bucket. The admin account is checked against its
authenticated JWT email by both the UI and database policies. Do not enable
public account creation: the admin account must be provisioned separately.

## Public news and CMS behavior

- `login.html` uses Supabase email/password authentication and rejects every
  account other than the configured admin email.
- `admin.html` checks the live Supabase session on each load. It supports news
  creation, editing, publishing, deletion, and persistent image uploads in
  Supabase. These changes do not automatically update the static public dataset.
- Public pages render from the editable `assets/js/news-data.js` dataset and
  do not need Supabase. The current 56 entries are clearly marked sample copy;
  replace them with verified newsroom content before publication. Edit this
  file to add, update, or remove public stories.
- The homepage shows the latest 8 records across all categories. Each category
  page shows up to 8 records from that category, with Load More for further
  entries added to the dataset.
- `article.html` resolves a record from the local dataset using its `id` query
  parameter.
- Supabase configuration is required for admin authentication and the existing
  Supabase-backed admin news-management tools; public news display continues to
  work without it.
