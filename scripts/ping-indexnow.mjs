/**
 * Highland Farms — Bing IndexNow Submission
 * Run after each deploy: npm run indexnow
 *
 * IndexNow lets Bing discover new/updated URLs immediately
 * instead of waiting for the next crawl cycle.
 */

const KEY = "16af3c9866154db18d5a1655478c4daa"; // Registered in Bing WMT portal
const HOST = "highlandfarmsoregon.com";
const BASE_URL = `https://${HOST}`;

const urls = [
  "/",
  "/weddings",
  "/farm-tours",
  "/nordic-spa",
  "/sauna-near-portland",
  "/stay",
  "/stay/lodge",
  "/stay/cottage",
  "/stay/whole-farm",
  "/stay/camp",
  "/wedding-portfolio",
  "/wedding-portfolio/hannah-max",
  "/wedding-portfolio/jen-ryan",
  "/wedding-portfolio/sydney-casey",
  "/wedding-portfolio/riley-jordan",
  "/wedding-portfolio/maya-justin",
  "/wedding-portfolio/olivia-connor",
  "/about",
  "/celebrations",
  "/contact",
  "/shop",
].map((path) => `${BASE_URL}${path}`);

async function pingIndexNow() {
  console.log(`Submitting ${urls.length} URLs to Bing IndexNow...`);

  const response = await fetch("https://www.bing.com/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `${BASE_URL}/${KEY}.txt`, // https://highlandfarmsoregon.com/16af3c9866154db18d5a1655478c4daa.txt
      urlList: urls,
    }),
  });

  if (response.ok || response.status === 202) {
    console.log(`✓ Submitted ${urls.length} URLs (status ${response.status})`);
    urls.forEach((u) => console.log(`  ${u}`));
  } else {
    const text = await response.text();
    console.error(`✗ IndexNow failed: ${response.status} — ${text}`);
    process.exit(1);
  }
}

pingIndexNow().catch((err) => {
  console.error(err);
  process.exit(1);
});
