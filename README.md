# ToolQ

[![SEO canonical check](https://github.com/pareshsutharr/ToolQ/actions/workflows/seo-check.yml/badge.svg)](https://github.com/pareshsutharr/ToolQ/actions/workflows/seo-check.yml)

For a full breakdown of every feature, tool, and architectural decision in this project, see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md).

## SEO canonical checks

Run this after each production deploy:

```bash
npm run seo:check
```

The check verifies that:

- `http://toolq.online/*`, `https://toolq.online/*`, and `http://www.toolq.online/*`
  redirect permanently (`301`/`308`) to `https://www.toolq.online/*`.
- The homepage canonical tag, Open Graph URL, and JSON-LD use `https://www.toolq.online`.
- `robots.txt` points to `https://www.toolq.online/sitemap.xml` and does not block `/`.
- Every sitemap URL uses `https://www.toolq.online`.

GitHub Actions also runs this daily and can be triggered manually from the
`SEO canonical check` workflow.

## Scheduled blog publishing

Blog posts live in `src/lib/blog.ts`. Each post has a `publishAt` date. The
blog index, article pages, and sitemap only expose posts whose publish date has
arrived, so ToolQ can publish scheduled posts automatically after deployment.

Current cadence: Monday and Thursday at 09:00 UTC.

Current schedule: 104 posts, enough for one year at two posts per week.
