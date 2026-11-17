// Harbor Comic Source Plugin: Indie & Sci-Fi (سلاسل وأبطال مستقلة)
// Hybrid source: Arabic translations from ArComixVerse + Full Western runs from XoxoComic

const AR_BASE = "https://arcomixverse.blogspot.com";
const XOXO_BASE = "https://xoxocomic.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const XOXO_KEYWORD = "invincible";
const AR_TAG = "IMAGE";

async function getJson(url) {
  const res = await harbor.http(url, { responseType: "json", headers: { "User-Agent": UA } });
  if (typeof res === "string") {
    try { return JSON.parse(res); } catch(e) { return null; }
  }
  if (res && res.body) {
    if (typeof res.body === "object") return res.body;
    try { return JSON.parse(res.body); } catch(e) { return null; }
  }
  return res;
}

async function getHtml(url) {
  const res = await harbor.http(url, { responseType: "text", headers: { "User-Agent": UA } });
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

function extractBloggerImages(html) {
  const urls = [];
  const re = /https?:\/\/(?:blogger\.googleusercontent\.com\/img\/[^\s"\'<>]+|[^\s"\'<>]+\.(?:jpg|png|webp|jpeg))/gi;
  let m;
  while ((m = re.exec(html || "")) !== null) {
    let u = m[0];
    if (u.includes("s72-c")) u = u.replace("/s72-c/", "/s1600/");
    if (!urls.includes(u) && !u.includes("favicon") && !u.includes("blank.gif")) {
      urls.push(u);
    }
  }
  return urls;
}

const plugin = {
  id: "indie",
  name: "Indie & Sci-Fi (سلاسل وأبطال مستقلة)",
  version: "4.0.0",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 24) + 1;
    const items = [];

    // Arabic runs on page 1
    if (page === 1) {
      try {
        const arData = await getJson(`${AR_BASE}/feeds/posts/default/-/${encodeURIComponent(AR_TAG)}?alt=json&max-results=15`);
        const arEntries = arData?.feed?.entry || [];
        for (const e of arEntries) {
          const postId = (e.id?.$t || "").split("post-").pop();
          const title = cleanTitle(e.title?.$t);
          const imgs = extractBloggerImages(e.content?.$t || "");
          const cover = e.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || imgs[0];
          if (postId) {
            items.push({
              id: "ar:" + postId,
              title: "[عربي] " + title,
              cover: cover
            });
          }
        }
      } catch(e) {}
    }

    // Xoxo runs
    try {
      const xoxoUrl = `${XOXO_BASE}/search-comic?keyword=${encodeURIComponent(XOXO_KEYWORD)}&page=${page}`;
      const xHtml = await getHtml(xoxoUrl);
      const cardRe = /<div[^>]*class=["'][^"']*item[^"']*["'][\s\S]*?<a[^>]*href=["'](https:\/\/xoxocomic\.com\/comic\/[^"'\s]+)["'][\s\S]*?<img[^>]+(?:data-src|src)=["']([^"'\s]+)["'][^>]*alt=["']([^"']*)["']/gi;
      const xMatches = Array.from(xHtml.matchAll(cardRe));
      for (const m of xMatches) {
        const slug = m[1].split("/comic/").pop().replace(/\/$/, "");
        let cover = m[2];
        if (cover.startsWith("//")) cover = "https:" + cover;
        else if (cover.startsWith("/")) cover = XOXO_BASE + cover;
        const title = cleanTitle((m[3] || slug).replace(/\s*Comic\s*$/i, ""));
        items.push({
          id: slug,
          title: title,
          cover: cover
        });
      }
    } catch(e) {}

    return items;
  },

  async search(query, offset) {
    const q = String(query || "").trim();
    const page = Math.floor((Number(offset) || 0) / 24) + 1;
    const items = [];

    // Arabic search
    try {
      const arData = await getJson(`${AR_BASE}/feeds/posts/default?alt=json&q=${encodeURIComponent(q + " " + XOXO_KEYWORD)}&max-results=10`);
      const arEntries = arData?.feed?.entry || [];
      for (const e of arEntries) {
        const postId = (e.id?.$t || "").split("post-").pop();
        const title = cleanTitle(e.title?.$t);
        const imgs = extractBloggerImages(e.content?.$t || "");
        const cover = e.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || imgs[0];
        if (postId) {
          items.push({
            id: "ar:" + postId,
            title: "[عربي] " + title,
            cover: cover
          });
        }
      }
    } catch(e) {}

    // Xoxo search
    try {
      const xoxoUrl = `${XOXO_BASE}/search-comic?keyword=${encodeURIComponent(XOXO_KEYWORD + " " + q)}&page=${page}`;
      const xHtml = await getHtml(xoxoUrl);
      const cardRe = /<div[^>]*class=["'][^"']*item[^"']*["'][\s\S]*?<a[^>]*href=["'](https:\/\/xoxocomic\.com\/comic\/[^"'\s]+)["'][\s\S]*?<img[^>]+(?:data-src|src)=["']([^"'\s]+)["'][^>]*alt=["']([^"']*)["']/gi;
      const xMatches = Array.from(xHtml.matchAll(cardRe));
      for (const m of xMatches) {
        const slug = m[1].split("/comic/").pop().replace(/\/$/, "");
        let cover = m[2];
        if (cover.startsWith("//")) cover = "https:" + cover;
        else if (cover.startsWith("/")) cover = XOXO_BASE + cover;
        const title = cleanTitle((m[3] || slug).replace(/\s*Comic\s*$/i, ""));
        items.push({
          id: slug,
          title: title,
          cover: cover
        });
      }
    } catch(e) {}

    return items;
  },

  async detail(id) {
    if (id.startsWith("ar:")) {
      const postId = id.replace("ar:", "");
      const data = await getJson(`${AR_BASE}/feeds/posts/default/${postId}?alt=json`);
      const entry = data?.entry;
      const title = cleanTitle(entry?.title?.$t || id);
      const content = entry?.content?.$t || "";
      const imgs = extractBloggerImages(content);
      const cover = entry?.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || imgs[0];
      const desc = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return {
        id: id,
        title: "[عربي] " + title,
        cover: cover,
        description: desc,
        author: "Image Comics / Indie (مترجم)",
        status: "completed"
      };
    }

    const html = await getHtml(`${XOXO_BASE}/comic/${id}`);
    const titleMatch = html.match(/<h1[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const descMatch = html.match(/<div[^>]*class=["'][^"']*detail-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const coverMatch = html.match(/<div[^>]*class=["'][^"']*col-image[^"']*["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
    
    const title = titleMatch ? cleanTitle(titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*Comic\s*$/i, "")) : cleanTitle(id.replace(/-/g, " "));
    const description = descMatch ? cleanTitle(descMatch[1].replace(/<[^>]+>/g, " ")) : "Indie & Sci-Fi (سلاسل وأبطال مستقلة) comic series.";
    let cover = coverMatch ? coverMatch[1] : `${XOXO_BASE}/images/series/${id}.jpg`;
    if (cover.startsWith("//")) cover = "https:" + cover;

    return {
      id: id,
      title: title,
      cover: cover,
      description: description,
      author: "Image Comics / Indie",
      status: "ongoing"
    };
  },

  async chapters(id) {
    if (id.startsWith("ar:")) {
      const postId = id.replace("ar:", "");
      const data = await getJson(`${AR_BASE}/feeds/posts/default/${postId}?alt=json`);
      const content = data?.entry?.content?.$t || "";
      const labelMatch = content.match(/data-label=["']([^"']+)["']/i);
      if (labelMatch) {
        const label = labelMatch[1].trim();
        const chData = await getJson(`${AR_BASE}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=50`);
        const chEntries = chData?.feed?.entry || [];
        if (chEntries.length > 0) {
          return chEntries.map((c, i) => {
            const chId = (c.id?.$t || "").split("post-").pop();
            return {
              id: "ar:" + chId,
              chapter: String(i + 1),
              title: cleanTitle(c.title?.$t || `العدد ${i + 1}`)
            };
          });
        }
      }
      return [
        {
          id: id,
          chapter: "1",
          title: cleanTitle(data?.entry?.title?.$t || "العدد كامل")
        }
      ];
    }

    const html = await getHtml(`${XOXO_BASE}/comic/${id}`);
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
    if (chapterId.startsWith("ar:")) {
      const postId = chapterId.replace("ar:", "");
      const data = await getJson(`${AR_BASE}/feeds/posts/default/${postId}?alt=json`);
      const content = data?.entry?.content?.$t || "";
      let imgs = extractBloggerImages(content);
      if (imgs.length <= 2) {
        const labelMatch = content.match(/data-label=["']([^"']+)["']/i);
        if (labelMatch) {
          const label = labelMatch[1].trim();
          const chData = await getJson(`${AR_BASE}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=50`);
          const entries = chData?.feed?.entry || [];
          for (const e of entries) {
            const eImgs = extractBloggerImages(e.content?.$t || "");
            if (eImgs.length > 2) return eImgs;
          }
        }
      }
      return imgs;
    }

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
