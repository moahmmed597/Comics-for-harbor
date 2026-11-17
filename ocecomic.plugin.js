// Harbor Comic Source Plugin: OceComic (All Western Comics - English)
// Comprehensive Western comics in original English: Marvel, DC, Image, Dark Horse, Boom Studios
// Hosted with Google CDN image delivery (bp.blogspot / blogger)

const BASE = "https://ocecomic.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function getHtml(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await harbor.http(url, {
    responseType: "text",
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    timeoutMs: 25000
  });
  if (typeof res === "string") return res;
  if (res && typeof res.body === "string") return res.body;
  if (res && res.text) return await res.text();
  return String(res || "");
}

function abs(url) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE + url;
  return BASE + "/" + url;
}

function cleanTitle(str) {
  return (str || "")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .trim();
}

function extractCards(html) {
  const rawHtml = typeof html === "string" ? html : (html && html.body ? html.body : String(html || ""));
  const items = [];
  const seen = new Set();

  if (typeof harbor !== "undefined" && typeof harbor.parseHtml === "function") {
    try {
      const doc = harbor.parseHtml(rawHtml);
      const boxes = doc.querySelectorAll(".item, div.comic-item");
      for (const box of boxes) {
        const a = box.querySelector("a[href*='/comic/']");
        const img = box.querySelector("img");
        if (a && img) {
          const href = a.attr("href") || "";
          const m = href.match(/\/comic\/(\d+)\/([^/?#]+)/);
          if (m) {
            const id = m[1] + "/" + m[2];
            const cover = img.attr("src") || img.attr("data-src") || "";
            const title = cleanTitle(img.attr("alt") || m[2].replace(/-/g, " "));
            if (!seen.has(id)) {
              seen.add(id);
              items.push({
                id: id,
                title: title || "Comic",
                cover: abs(cover)
              });
            }
          }
        }
      }
    } catch (_) {}
  }

  if (items.length > 0) return items;

  const re = /<div class="item">[\s\S]*?<a[^>]*href=["'](?:https?:\/\/[^\/]+)?\/comic\/(\d+)\/([^"'\/\?#]+)["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["'](?:[^>]*alt=["']([^"']*)["'])?[\s\S]*?<\/div>/gi;
  let m;
  while ((m = re.exec(rawHtml)) !== null) {
    const id = m[1] + "/" + m[2];
    const cover = m[3];
    const rawTitle = m[4] || m[2].replace(/-/g, " ");
    const title = cleanTitle(rawTitle);
    if (!seen.has(id)) {
      seen.add(id);
      items.push({
        id: id,
        title: title || "Comic",
        cover: abs(cover),
      });
    }
  }
  return items;
}

const plugin = {
  id: "ocecomic",
  name: "OceComic (English Comics)",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 30) + 1;
    const html = await getHtml("/comic/all/popular?page=" + page);
    return extractCards(html);
  },

  async search(query, offset) {
    const html = await getHtml("/search?keyword=" + encodeURIComponent(query));
    return extractCards(html);
  },

  async detail(id) {
    const html = await getHtml("/comic/" + id);
    let title = id;
    let cover = undefined;

    if (typeof harbor !== "undefined" && typeof harbor.parseHtml === "function") {
      try {
        const doc = harbor.parseHtml(html);
        const titleEl = doc.querySelector("h1, .detail h2, title");
        if (titleEl) {
          title = cleanTitle(titleEl.text().replace(/^Read Comic /i, ""));
        }
        const imgEl = doc.querySelector("img[src*='cover']");
        if (imgEl) cover = imgEl.attr("src");
      } catch (_) {}
    }

    if (!cover) {
      const titleMatch = html.match(/<title>Read Comic ['"]?([^'"]+)['"]?/i);
      title = cleanTitle(titleMatch ? titleMatch[1] : id);
      const coverMatch = html.match(/<img[^>]*src=["']([^"']*cover[^"']*)["']/i);
      cover = coverMatch ? coverMatch[1] : undefined;
    }

    return {
      id,
      title,
      cover: abs(cover),
      description: "Read " + title + " in English on OceComic with high quality full pages.",
    };
  },

  async chapters(id) {
    const html = await getHtml("/comic/" + id);
    const chapters = [];
    const seen = new Set();
    const idPrefix = id.split("/")[0];

    if (typeof harbor !== "undefined" && typeof harbor.parseHtml === "function") {
      try {
        const doc = harbor.parseHtml(html);
        const links = doc.querySelectorAll("a[href*='/comic/']");
        for (const a of links) {
          const href = a.attr("href") || "";
          const m = href.match(/\/comic\/\d+\/(\d+)#\d+/);
          if (m) {
            const relHref = href.startsWith("http") ? new URL(href).pathname + new URL(href).hash : href;
            if (!seen.has(relHref)) {
              seen.add(relHref);
              const linkText = cleanTitle(a.text() || ("Issue #" + m[1]));
              chapters.push({
                id: relHref,
                chapter: m[1],
                title: linkText || ("Issue #" + m[1]),
              });
            }
          }
        }
      } catch (_) {}
    }

    if (!chapters.length) {
      const re = /<a[^>]*href=["'](?:https?:\/\/[^\/]+)?(\/comic\/\d+\/(\d+)#\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        const href = m[1];
        const issueNum = m[2];
        const linkText = cleanTitle(m[3].replace(/<[^>]+>/g, "").trim());
        if (!seen.has(href)) {
          seen.add(href);
          chapters.push({
            id: href,
            chapter: issueNum,
            title: linkText || ("Issue #" + issueNum),
          });
        }
      }
    }

    if (!chapters.length) {
      chapters.push({
        id: "/comic/" + idPrefix + "/1#1",
        chapter: "1",
        title: "Issue #1",
      });
    }
    return chapters;
  },

  async pageUrls(chapterId) {
    const html = await getHtml(chapterId);
    const urls = [];

    if (typeof harbor !== "undefined" && typeof harbor.parseHtml === "function") {
      try {
        const doc = harbor.parseHtml(html);
        const imgs = doc.querySelectorAll("figure img, div.pages img, div.page img");
        for (const img of imgs) {
          const src = img.attr("src") || img.attr("data-src") || "";
          if (src && !urls.includes(src) && !src.includes("logo") && !src.includes("favicon") && !src.includes("cover-s.jpg")) {
            urls.push(src);
          }
        }
      } catch (_) {}
    }

    if (!urls.length) {
      const re = /<figure[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        const u = m[1];
        if (!urls.includes(u) && !u.includes("logo") && !u.includes("favicon") && !u.includes("cover-s.jpg")) {
          urls.push(u);
        }
      }
    }

    if (!urls.length) {
      const re2 = /<img[^>]*src=["'](https?:\/\/(?:blogger\.googleusercontent\.com\/img\/[^\s"'<>]+|\d+\.bp\.blogspot\.com\/[^\s"'<>]+|[^\s"'<>]+\.(?:jpg|png|webp)))["']/gi;
      let m;
      while ((m = re2.exec(html)) !== null) {
        const u = m[1];
        if (!urls.includes(u) && !u.includes("logo") && !u.includes("favicon") && !u.includes("cover-s.jpg")) {
          urls.push(u);
        }
      }
    }
    return urls;
  },

  async tags() {
    return [
      { id: "superhero", name: "Superheroes (أبطال خارقين)", group: "Genre" },
      { id: "sci-fi", name: "Sci-Fi (خيال علمي)", group: "Genre" },
      { id: "action", name: "Action (أكشن)", group: "Genre" },
      { id: "horror", name: "Horror (رعب)", group: "Genre" },
      { id: "war", name: "War (حروب)", group: "Genre" },
    ];
  }
};

return plugin;
