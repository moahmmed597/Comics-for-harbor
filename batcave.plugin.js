// Harbor Comic Source Plugin: Batcave (باتكيف)
// Arabic translations of Batman, DC, and Marvel comics

const BASE = "https://batcave.biz";

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
  id: "batcave",
  name: "باتكيف (Batcave)",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 20) + 1;
    const doc = await getDoc("/page/" + page + "/");
    const items = [];
    doc.querySelectorAll("article, .post-item, .post").forEach((el) => {
      const link = el.querySelector("h2 a, h3 a, a");
      if (!link) return;
      const href = link.attr("href") || "";
      const id = href.replace(BASE, "").replace(/^\//, "").replace(/\/$/, "");
      if (!id) return;
      const img = el.querySelector("img");
      items.push({
        id,
        title: (link.text() || id).trim(),
        cover: abs(img?.attr("data-src") || img?.attr("src")),
      });
    });
    return items;
  },

  async search(query, offset) {
    const page = Math.floor((Number(offset) || 0) / 20) + 1;
    const doc = await getDoc("/?s=" + encodeURIComponent(query) + "&paged=" + page);
    const items = [];
    doc.querySelectorAll("article, .post-item, .post").forEach((el) => {
      const link = el.querySelector("h2 a, h3 a, a");
      if (!link) return;
      const href = link.attr("href") || "";
      const id = href.replace(BASE, "").replace(/^\//, "").replace(/\/$/, "");
      if (!id) return;
      const img = el.querySelector("img");
      items.push({
        id,
        title: (link.text() || id).trim(),
        cover: abs(img?.attr("data-src") || img?.attr("src")),
      });
    });
    return items;
  },

  async detail(id) {
    const doc = await getDoc("/" + id + "/");
    const title = (doc.querySelector(".entry-title, h1")?.text() || id).trim();
    const cover = abs(doc.querySelector(".entry-content img")?.attr("src"));
    const desc = (doc.querySelector(".entry-content p")?.text() || "").trim();

    return {
      id,
      title,
      cover,
      description: desc,
    };
  },

  async chapters(id) {
    const doc = await getDoc("/" + id + "/");
    const title = (doc.querySelector(".entry-title, h1")?.text() || "العدد كامل").trim();
    return [
      {
        id,
        chapter: "1",
        title,
      }
    ];
  },

  async pageUrls(chapterId) {
    const doc = await getDoc("/" + chapterId + "/");
    const urls = [];
    doc.querySelectorAll(".entry-content img, .post-content img").forEach((img) => {
      const src = abs(img.attr("src") || img.attr("data-src"));
      if (src && !urls.includes(src)) urls.push(src);
    });
    return urls;
  },

  async tags() {
    return [
      { id: "batman", name: "باتمان (Batman)", group: "شخصيات" },
      { id: "dc-comics", name: "دي سي (DC Comics)", group: "الناشر" },
      { id: "marvel", name: "مارفل (Marvel)", group: "الناشر" },
    ];
  }
};

return plugin;
