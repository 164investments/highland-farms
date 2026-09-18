/**
 * Guards the invariant that every indexable page renders the site's JSON-LD graph.
 *
 * `StructuredData` derives its BreadcrumbList from a `pathname` prop, so it is
 * rendered per page rather than once in the root layout. That buys correct
 * breadcrumbs at the cost of a real footgun: a new page that forgets the line
 * silently ships with NO structured data at all — no LocalBusiness, no
 * EventVenue, no AggregateRating — and nothing would catch it.
 *
 * This test is that nothing. Fail here means a page is invisible to every
 * engine that reads schema.org.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const APP = new URL("../src/app", import.meta.url).pathname;

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === "api" ? [] : pageFiles(full);
    }
    return entry === "page.tsx" ? [full] : [];
  });
}

test("every indexable page renders the site JSON-LD graph", () => {
  const offenders: string[] = [];
  for (const file of pageFiles(APP)) {
    const src = readFileSync(file, "utf8");
    // Pages that ask not to be indexed do not carry the business graph:
    // emitting an 8-entity LocalBusiness on a noindex cart page is noise.
    if (/index:\s*false/.test(src)) continue;
    if (!/<(Site)?StructuredData\s+pathname=/.test(src)) {
      offenders.push(file.slice(APP.length + 1));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `These indexable pages render no structured data. Add ` +
      `<StructuredData pathname="/your/route" />:\n  ${offenders.join("\n  ")}`,
  );
});

test("the root layout does not also render it (that would duplicate the graph)", () => {
  const layout = readFileSync(join(APP, "layout.tsx"), "utf8");
  const rendered = /^\s*<StructuredData[\s/>]/m.test(layout);
  assert.equal(rendered, false, "layout.tsx renders StructuredData; pages do too — the graph would appear twice");
});
