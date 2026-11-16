// Harbor Comic Source Plugin: ComicExtra (comicextra.org)
const BASE = "https://comicextra.org";

async function getDoc(path) {
  const url = path.startsWith("http") ? path : BASE + (path.startsWith("/") ? path : "/" + path);
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
  id: "comicextra",
  name: "ComicExtra",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 30) + 1;
    const doc = await getDoc("/popular-comic?page=" + page);
    const items = [];
    doc.querySelectorAll(".cartoon-box, .hl-item").forEach((el) => {
      const link = el.querySelector("h3 a, a");
      if (!link) return;
      const href = link.attr("href") || "";
      const slug = href.replace(/^https?:\/\/[^/]+\/comic\//, "").replace(/^\/comic\//, "").replace(/\/$/, "");
      if (!slug) return;
      const img = el.querySelector("img");
      items.push({
        id: slug,
        title: (link.text() || "").trim(),
        cover: abs(img?.attr("data-src") || img?.attr("src")),
      });
    });
    return items;
  },

  async search(query, offset) {
    const page = Math.floor((Number(offset) || 0) / 30) + 1;
    const doc = await getDoc("/comic-search?key=" + encodeURIComponent(query) + "&page=" + page);
    const items = [];
    doc.querySelectorAll(".cartoon-box, .hl-item").forEach((el) => {
      const link = el.querySelector("h3 a, a");
      if (!link) return;
      const href = link.attr("href") || "";
      const slug = href.replace(/^https?:\/\/[^/]+\/comic\//, "").replace(/^\/comic\//, "").replace(/\/$/, "");
      if (!slug) return;
      const img = el.querySelector("img");
      items.push({
        id: slug,
        title: (link.text() || "").trim(),
        cover: abs(img?.attr("data-src") || img?.attr("src")),
      });
    });
    return items;
  },

  async detail(id) {
    const doc = await getDoc("/comic/" + id);
    const title = (doc.querySelector(".title-1, h1")?.text() || id).trim();
    const cover = abs(doc.querySelector(".movie-l-img img")?.attr("src"));
    const desc = (doc.querySelector("#film-content, .desc")?.text() || "").trim();
    const author = (doc.querySelector(".author a, .detail-list dd")?.text() || "").trim();

    return {
      id,
      title,
      cover,
      description: desc,
      author: author || undefined,
    };
  },

  async chapters(id) {
    const doc = await getDoc("/comic/" + id);
    const chapters = [];
    doc.querySelectorAll("#list tr td a, .chapter-list a").forEach((link) => {
      const href = link.attr("href") || "";
      const chSlug = href.replace(/^https?:\/\/[^/]+\/comic\//, "").replace(/^\/comic\//, "");
      if (!chSlug) return;
      const title = (link.text() || "").trim();
      const numMatch = title.match(/(?:issue|chapter|#)\s*(\d+(?:\.\d+)?)/i);
      chapters.push({
        id: chSlug,
        chapter: numMatch ? numMatch[1] : title,
        title: title,
      });
    });
    return chapters;
  },

  async pageUrls(chapterId) {
    const doc = await getDoc("/comic/" + chapterId + "/full");
    const urls = [];
    doc.querySelectorAll(".chapter-container img, .chapter_img").forEach((img) => {
      const src = abs(img.attr("src") || img.attr("data-src"));
      if (src && !urls.includes(src)) urls.push(src);
    });
    return urls;
  },

  async tags() {
    return [
      { id: "dc-comics", name: "DC Comics", group: "Publisher" },
      { id: "marvel", name: "Marvel", group: "Publisher" },
      { id: "action", name: "Action", group: "Genre" },
      { id: "superhero", name: "Superhero", group: "Genre" },
      { id: "adventure", name: "Adventure", group: "Genre" }
    ];
  }
};

return plugin;
