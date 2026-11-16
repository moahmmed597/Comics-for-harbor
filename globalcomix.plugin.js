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

const plugin = {
  id: "globalcomix",
  name: "GlobalComix (English)",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 24) + 1;
    const doc = await getDoc("/comics?page=" + page);
    const items = [];
    doc.querySelectorAll(".comic-card, .card, [data-comic-id]").forEach((el) => {
      const link = el.querySelector("a[href*='/c/'], a");
      if (!link) return;
      const href = link.attr("href") || "";
      const m = href.match(/\/c\/([^/?#]+)/);
      const id = m ? m[1] : href.replace(BASE, "").replace(/^\//, "");
      if (!id) return;
      const img = el.querySelector("img");
      const title = (el.querySelector(".title, h3, h4")?.text() || link.attr("title") || id).trim();
      items.push({
        id,
        title,
        cover: abs(img?.attr("data-src") || img?.attr("src")),
      });
    });
    return items;
  },

  async search(query, offset) {
    const page = Math.floor((Number(offset) || 0) / 24) + 1;
    const doc = await getDoc("/search?q=" + encodeURIComponent(query) + "&page=" + page);
    const items = [];
    doc.querySelectorAll(".comic-card, .card, [data-comic-id]").forEach((el) => {
      const link = el.querySelector("a[href*='/c/'], a");
      if (!link) return;
      const href = link.attr("href") || "";
      const m = href.match(/\/c\/([^/?#]+)/);
      const id = m ? m[1] : href.replace(BASE, "").replace(/^\//, "");
      if (!id) return;
      const img = el.querySelector("img");
      const title = (el.querySelector(".title, h3, h4")?.text() || link.attr("title") || id).trim();
      items.push({
        id,
        title,
        cover: abs(img?.attr("data-src") || img?.attr("src")),
      });
    });
    return items;
  },

  async detail(id) {
    const doc = await getDoc("/c/" + id);
    const title = (doc.querySelector("h1, .comic-title")?.text() || id).trim();
    const cover = abs(doc.querySelector(".comic-cover img, .poster img")?.attr("src"));
    const desc = (doc.querySelector(".description, .synopsis, p.lead")?.text() || "").trim();
    const author = (doc.querySelector(".creator a, .author")?.text() || "").trim();

    return {
      id,
      title,
      cover,
      description: desc,
      author: author || undefined,
    };
  },

  async chapters(id) {
    const doc = await getDoc("/c/" + id);
    const chapters = [];
    doc.querySelectorAll(".chapter-item, a[href*='/read/']").forEach((el) => {
      const link = el.name === "a" ? el : el.querySelector("a");
      if (!link) return;
      const href = link.attr("href") || "";
      const chId = href.replace(BASE, "").replace(/^\//, "");
      const title = (link.text() || "").trim() || "Chapter";
      chapters.push({
        id: chId,
        chapter: title,
        title: title,
      });
    });
    return chapters.length > 0 ? chapters : [{ id: "c/" + id + "/read", chapter: "1", title: "Read Online" }];
  },

  async pageUrls(chapterId) {
    const doc = await getDoc("/" + chapterId);
    const urls = [];
    doc.querySelectorAll(".reader-page img, .comic-page img, #reader img").forEach((img) => {
      const src = abs(img.attr("src") || img.attr("data-src"));
      if (src && !urls.includes(src)) urls.push(src);
    });
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
