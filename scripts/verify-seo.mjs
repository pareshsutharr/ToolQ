#!/usr/bin/env node

const canonicalOrigin = normalizeOrigin(
  process.env.SEO_CANONICAL_ORIGIN || "https://www.toolq.online",
);
const legacyOrigin = normalizeOrigin(process.env.SEO_LEGACY_ORIGIN || "https://toolq.online");
const redirectPath = process.env.SEO_CHECK_PATH || "/tools/dev/markdown-preview?seo-check=1";

const failures = [];

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, "");
}

function finalUrl(path = "/") {
  return new URL(path, `${canonicalOrigin}/`).toString();
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function assert(condition, message) {
  if (condition) {
    pass(message);
  } else {
    fail(message);
  }
}

async function fetchManual(url) {
  return fetch(url, {
    redirect: "manual",
    headers: {
      "user-agent": "ToolQ SEO checker (+https://www.toolq.online)",
    },
  });
}

async function checkRedirect(source, expectedTarget) {
  const response = await fetchManual(source);
  const location = response.headers.get("location");
  const resolvedLocation = location ? new URL(location, source).toString() : "";

  assert(
    response.status === 301,
    `${source} returns 301 Moved Permanently`,
  );
  assert(
    resolvedLocation === expectedTarget,
    `${source} redirects directly to ${expectedTarget}`,
  );
}

async function checkFinalPage() {
  const homeUrl = finalUrl("/");
  const response = await fetchManual(homeUrl);
  const html = await response.text();

  assert(response.status === 200, `${homeUrl} returns 200 OK`);
  assert(
    html.includes(`<link rel="canonical" href="${canonicalOrigin}"/>`) ||
      html.includes(`<link rel="canonical" href="${canonicalOrigin}/"`),
    `homepage canonical uses ${canonicalOrigin}`,
  );
  assert(
    html.includes(`property="og:url" content="${canonicalOrigin}"`),
    `homepage og:url uses ${canonicalOrigin}`,
  );
  assert(
    html.includes(`"@id":"${canonicalOrigin}/#website"`) &&
      html.includes(`"url":"${canonicalOrigin}"`),
    `homepage JSON-LD uses ${canonicalOrigin}`,
  );
  assert(
    !html.includes(`${legacyOrigin}/`) && !html.includes(`${legacyOrigin}"`),
    `homepage does not reference ${legacyOrigin}`,
  );
}

async function checkRobots() {
  const robotsUrl = finalUrl("/robots.txt");
  const response = await fetchManual(robotsUrl);
  const text = await response.text();

  assert(response.status === 200, `${robotsUrl} returns 200 OK`);
  assert(
    text.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`),
    "robots.txt points at the canonical sitemap",
  );
  assert(
    !/^Disallow:\s*\/\s*$/im.test(text),
    "robots.txt does not block the whole site",
  );
}

async function checkSitemap() {
  const sitemapUrl = finalUrl("/sitemap.xml");
  const response = await fetchManual(sitemapUrl);
  const xml = await response.text();
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

  assert(response.status === 200, `${sitemapUrl} returns 200 OK`);
  assert(locs.length > 0, "sitemap.xml contains URL entries");
  assert(
    locs.every((url) => url.startsWith(canonicalOrigin)),
    "every sitemap URL uses the canonical www HTTPS origin",
  );
  assert(
    locs.every((url) => !url.startsWith("http://") && !url.startsWith(legacyOrigin)),
    "sitemap has no http or non-www URLs",
  );
  assert(
    locs.includes(finalUrl("/tools/dev/markdown-preview")),
    "sitemap includes /tools/dev/markdown-preview",
  );
}

async function main() {
  const redirectChecks = [
    [`http://toolq.online${redirectPath}`, finalUrl(redirectPath)],
    [`${legacyOrigin}${redirectPath}`, finalUrl(redirectPath)],
    [`http://www.toolq.online${redirectPath}`, finalUrl(redirectPath)],
  ];

  for (const [source, expectedTarget] of redirectChecks) {
    await checkRedirect(source, expectedTarget);
  }

  await checkFinalPage();
  await checkRobots();
  await checkSitemap();

  if (failures.length > 0) {
    console.error(`\nSEO verification failed with ${failures.length} issue(s).`);
    process.exit(1);
  }

  console.log("\nSEO verification passed.");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
