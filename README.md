# ToolQ

## SEO canonical checks

Run this after each production deploy:

```bash
npm run seo:check
```

The check verifies that:

- `http://toolq.online/*`, `https://toolq.online/*`, and `http://www.toolq.online/*`
  redirect directly with `301` to `https://www.toolq.online/*`.
- The homepage canonical tag, Open Graph URL, and JSON-LD use `https://www.toolq.online`.
- `robots.txt` points to `https://www.toolq.online/sitemap.xml` and does not block `/`.
- Every sitemap URL uses `https://www.toolq.online`.

GitHub Actions also runs this daily and can be triggered manually from the
`SEO canonical check` workflow.

## Scheduled blog publishing

Blog posts live in `src/lib/blog.ts`. Each post has a `publishAt` date. The
blog index, article pages, and sitemap only expose posts whose publish date has
arrived, so you can load several weeks of posts at once and let ToolQ publish
two guides per week automatically.

Current cadence: Monday and Thursday at 09:00 UTC.
