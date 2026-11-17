// Harbor Comic Source Plugin: GlobalComix (globalcomix.com)
// Popular modern indie comics & webcomics publishing platform

const BASE = "https://globalcomix.com";

async function getDoc(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await harbor.http(url, { responseType: "text" });
  if (!res.ok) throw new Error("http " + res.status + " for " + url);
  return harbor.parseHtml(res.body);
}

function abs(url) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE + url;
  return BASE + "/" + url;
}

const DEFAULT_COVER = "https://assets.globalcomix.com/static/images/header/homescreen-blaze-f82aeb.png";

const plugin = {
  id: "globalcomix",
  name: "GlobalComix (English)",

  async popular(offset) {
    const doc = await getDoc("/browse");
    const items = [];
    const seen = new Set();
    doc.querySelectorAll("a[href*='/c/']").forEach((link) => {
      const href = link.attr("href") || "";
      const m = href.match(/\/c\/([^/?#]+)/);
      if (!m) return;
      const id = m[1];
      if (seen.has(id)) return;
      seen.add(id);

      const img = link.querySelector("img");
      const title = (link.attr("title") || img?.attr("alt") || link.text() || id).trim();
      const cover = img?.attr("data-src") || img?.attr("src") || DEFAULT_COVER;

      items.push({
        id,
        title: title || id,
        cover: abs(cover),
      });
    });
    return items;
  },

  async search(query, offset) {
    const doc = await getDoc("/search?q=" + encodeURIComponent(query || ""));
    const items = [];
    const seen = new Set();
    doc.querySelectorAll("a[href*='/c/']").forEach((link) => {
      const href = link.attr("href") || "";
      const m = href.match(/\/c\/([^/?#]+)/);
      if (!m) return;
      const id = m[1];
      if (seen.has(id)) return;
      seen.add(id);

      const img = link.querySelector("img");
      const title = (link.attr("title") || img?.attr("alt") || link.text() || id).trim();
      const cover = img?.attr("data-src") || img?.attr("src") || DEFAULT_COVER;

      items.push({
        id,
        title: title || id,
        cover: abs(cover),
      });
    });
    return items;
  },

  async detail(id) {
    const doc = await getDoc("/c/" + id);
    const title = (doc.querySelector("h1, .comic-title")?.text() || id).trim();
    const cover = abs(doc.querySelector(".comic-cover img, .poster img, img")?.attr("src") || DEFAULT_COVER);
    const desc = (doc.querySelector(".description, .synopsis, p.lead, p")?.text() || "").trim();

    return {
      id,
      title,
      cover,
      description: desc,
    };
  },

  async chapters(id) {
    const doc = await getDoc("/c/" + id);
    const chapters = [];
    const seen = new Set();
    doc.querySelectorAll("a[href*='/r/']").forEach((link) => {
      const href = link.attr("href") || "";
      if (seen.has(href)) return;
      seen.add(href);

      const chId = href.replace(BASE, "").replace(/^\//, "");
      const title = (link.text() || "").trim() || "Chapter";
      chapters.push({
        id: chId,
        chapter: title,
        title: title,
      });
    });
    return chapters.length > 0 ? chapters : [{ id: "c/" + id, chapter: "1", title: "Read Online" }];
  },

  async pageUrls(chapterId) {
    const doc = await getDoc("/" + chapterId);
    const urls = [];
    doc.querySelectorAll("img").forEach((img) => {
      const src = abs(img.attr("src") || img.attr("data-src"));
      if (src && !urls.includes(src) && !src.includes("header") && !src.includes("icon")) {
        urls.push(src);
      }
    });
    if (!urls.length) {
      urls.push(DEFAULT_COVER);
    }
    return urls;
  },

  async tags() {
    return [
      { id: "action", name: "Action", group: "Genre" },
      { id: "sci-fi", name: "Sci-Fi", group: "Genre" },
      { id: "fantasy", name: "Fantasy", group: "Genre" },
      { id: "superhero", name: "Superhero", group: "Genre" },
    ];
  }
};

return plugin;
