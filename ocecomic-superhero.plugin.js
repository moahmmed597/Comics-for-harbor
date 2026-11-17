// Harbor Comic Source Plugin: Western Heroes (English Superheroes)
// Marvel, DC, Image, Dark Horse superhero comics in English from OceComic

const BASE = "https://ocecomic.com";
const CATEGORY = "superhero";

async function getHtml(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await harbor.http(url);
  if (!res) throw new Error("Failed to fetch HTML from " + url);
  return res;
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
  const items = [];
  const seen = new Set();
  const re = /<div class="item">[\s\S]*?<a[^>]*href=["'](?:https?:\/\/[^\/]+)?\/comic\/(\d+)\/([^"'\/\?#]+)["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["'](?:[^>]*alt=["']([^"']*)["'])?[\s\S]*?<\/div>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1] + "/" + m[2];
    const cover = m[3];
    const rawTitle = m[4] || m[2].replace(/-/g, " ");
    const title = cleanTitle(rawTitle);
    if (!seen.has(id)) {
      seen.add(id);
      items.push({
        id: id,
        title: title || "Hero Comic",
        cover: abs(cover),
      });
    }
  }
  return items;
}

const plugin = {
  id: "ocecomic-superhero",
  name: "Western Heroes (English Superheroes)",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 30) + 1;
    const html = await getHtml("/comic/" + CATEGORY + "?page=" + page);
    return extractCards(html);
  },

  async search(query, offset) {
    const html = await getHtml("/search?keyword=" + encodeURIComponent(query));
    return extractCards(html);
  },

  async detail(id) {
    const html = await getHtml("/comic/" + id);
    const titleMatch = html.match(/<title>Read Comic ['"]?([^'"]+)['"]?/i);
    const title = cleanTitle(titleMatch ? titleMatch[1] : id);
    const coverMatch = html.match(/<img[^>]*src=["']([^"']*cover[^"']*)["']/i);
    const cover = coverMatch ? coverMatch[1] : undefined;

    return {
      id,
      title,
      cover: abs(cover),
      description: "Read " + title + " in English on OceComic.",
    };
  },

  async chapters(id) {
    const html = await getHtml("/comic/" + id);
    const chapters = [];
    const seen = new Set();
    const idPrefix = id.split("/")[0];
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
    const re = /<figure[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const u = m[1];
      if (!urls.includes(u) && !u.includes("logo") && !u.includes("favicon") && !u.includes("cover-s.jpg")) {
        urls.push(u);
      }
    }
    if (!urls.length) {
      const re2 = /<img[^>]*src=["'](https?:\/\/(?:blogger\.googleusercontent\.com\/img\/[^\s"'<>]+|\d+\.bp\.blogspot\.com\/[^\s"'<>]+|[^\s"'<>]+\.(?:jpg|png|webp)))["']/gi;
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
      { id: "superhero", name: "أبطال خارقين (Superheroes)", group: "تصنيف" },
      { id: "action", name: "أكشن (Action)", group: "تصنيف" },
      { id: "adventure", name: "مغامرات (Adventure)", group: "تصنيف" },
    ];
  }
};

return plugin;
