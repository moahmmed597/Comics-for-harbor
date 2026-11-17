// Harbor Comic Source Plugin: XoxoComic (All Western Comics - 35,000+ Comics)
// Comprehensive Western comics: Marvel, DC, Spider-Man, Batman, Avengers, X-Men, Image, Dark Horse

const BASE = "https://xoxocomic.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function getHtml(url) {
  const fullUrl = url.startsWith("http") ? url : BASE + (url.startsWith("/") ? url : "/" + url);
  const res = await harbor.http(fullUrl, {
    responseType: "text",
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  if (typeof res === "string") return res;
  if (res && typeof res.body === "string") return res.body;
  if (res && res.text) return await res.text();
  return String(res || "");
}

function cleanTitle(str) {
  return String(str || "")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractCards(html) {
  const cardRe = /<div[^>]*class=["'][^"']*item[^"']*["'][\s\S]*?<a[^>]*href=["'](https:\/\/xoxocomic\.com\/comic\/[^"'\s]+)["'][\s\S]*?<img[^>]+(?:data-src|src)=["']([^"'\s]+)["'][^>]*alt=["']([^"']*)["']/gi;
  const matches = Array.from(html.matchAll(cardRe));
  const seen = new Set();
  const list = [];

  for (const m of matches) {
    const rawUrl = m[1];
    const slug = rawUrl.split("/comic/").pop().replace(/\/$/, "");
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    let cover = m[2];
    if (cover.startsWith("//")) cover = "https:" + cover;
    else if (cover.startsWith("/")) cover = BASE + cover;

    const rawTitle = m[3] || slug.replace(/-/g, " ");
    const title = cleanTitle(rawTitle.replace(/\s*Comic\s*$/i, ""));

    list.push({
      id: slug,
      title: title,
      cover: cover
    });
  }
  return list;
}

const plugin = {
  id: "xoxocomic",
  name: "XoxoComic (35,000+ Western Comics - English)",
  version: "4.0.0",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 24) + 1;
    const url = `/popular-comic?page=${page}`;
    const html = await getHtml(url);
    return extractCards(html);
  },

  async search(query, offset) {
    const q = String(query || "").trim();
    if (!q) return this.popular(offset);

    const page = Math.floor((Number(offset) || 0) / 24) + 1;
    const url = `/search-comic?keyword=${encodeURIComponent(q)}&page=${page}`;
    const html = await getHtml(url);
    return extractCards(html);
  },

  async detail(id) {
    const html = await getHtml(`/comic/${id}`);
    
    const titleMatch = html.match(/<h1[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const descMatch = html.match(/<div[^>]*class=["'][^"']*detail-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const coverMatch = html.match(/<div[^>]*class=["'][^"']*col-image[^"']*["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
    
    const title = titleMatch ? cleanTitle(titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*Comic\s*$/i, "")) : cleanTitle(id.replace(/-/g, " "));
    const description = descMatch ? cleanTitle(descMatch[1].replace(/<[^>]+>/g, " ")) : "Western comic series.";
    let cover = coverMatch ? coverMatch[1] : `https://xoxocomic.com/images/series/${id}.jpg`;
    if (cover.startsWith("//")) cover = "https:" + cover;

    return {
      id: id,
      title: title,
      cover: cover,
      description: description,
      author: "Marvel / DC / Western Creators",
      status: "ongoing"
    };
  },

  async chapters(id) {
    const html = await getHtml(`/comic/${id}`);
    const chRe = /<a[^>]*href=["'](https:\/\/xoxocomic\.com\/comic\/[^"'\s]*\/issue-[^"'\s]*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const matches = Array.from(html.matchAll(chRe));
    const seen = new Set();
    const list = [];

    for (const m of matches) {
      const chUrl = m[1];
      if (seen.has(chUrl)) continue;
      seen.add(chUrl);

      const rawTitle = m[2].replace(/<[^>]+>/g, "").trim();
      const issueNumMatch = chUrl.match(/issue-([0-9.]+)/i);
      const issueNum = issueNumMatch ? issueNumMatch[1] : String(list.length + 1);
      const title = rawTitle && rawTitle !== "Start Reading" ? cleanTitle(rawTitle) : `Issue #${issueNum}`;

      list.push({
        id: chUrl,
        chapter: issueNum,
        title: title
      });
    }

    return list;
  },

  async pageUrls(chapterId) {
    const readUrl = chapterId.replace(/\/$/, "") + "/all";
    const html = await getHtml(readUrl);
    const imgRe = /<img[^>]+(?:data-original|data-src|src)=["'](https:\/\/xoxocomic\.com\/comic\/[^"'\s]+\/\d+\/[^"'\s]+\.(?:jpg|png|webp|jpeg))["']/gi;
    const matches = Array.from(html.matchAll(imgRe));
    const seen = new Set();
    const pages = [];

    for (const m of matches) {
      const src = m[1];
      if (!seen.has(src)) {
        seen.add(src);
        pages.push(src);
      }
    }

    return pages;
  }
};

return plugin;
