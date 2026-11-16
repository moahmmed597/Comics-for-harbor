// Harbor Comic Source Plugin: ArComixVerse (arcomixverse.blogspot.com)
// Arabic Comic Translations (DC, Marvel, Indie)

const BASE = "https://arcomixverse.blogspot.com";

async function getJson(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await harbor.http(url, { responseType: "json" });
  if (!res) throw new Error("Failed to fetch JSON from " + url);
  return res;
}

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

function entryToSummary(entry) {
  const title = entry.title?.$t || "Untitled";
  const link = (entry.link || []).find((l) => l.rel === "alternate")?.href || "";
  const id = link.replace(BASE, "").replace(/^\//, "");
  const cover = entry.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || 
                entry.content?.$t?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];

  return {
    id: id || link,
    title: title.trim(),
    cover: abs(cover),
  };
}

const plugin = {
  id: "arcomixverse",
  name: "ArComixVerse (عربي)",

  async popular(offset, tagId) {
    const startIndex = (Number(offset) || 0) + 1;
    let url = "/feeds/posts/default?alt=json&max-results=30&start-index=" + startIndex;
    if (tagId) {
      url = "/feeds/posts/default/-/" + encodeURIComponent(tagId) + "?alt=json&max-results=30&start-index=" + startIndex;
    }
    const data = await getJson(url);
    const entries = data.feed?.entry || [];
    return entries.map(entryToSummary).filter((e) => e.id);
  },

  async search(query, offset) {
    const startIndex = (Number(offset) || 0) + 1;
    const url = "/feeds/posts/default?alt=json&q=" + encodeURIComponent(query) + "&max-results=30&start-index=" + startIndex;
    const data = await getJson(url);
    const entries = data.feed?.entry || [];
    return entries.map(entryToSummary).filter((e) => e.id);
  },

  async detail(id) {
    const doc = await getDoc("/" + id);
    const title = (doc.querySelector(".post-title, h1")?.text() || id).trim();
    const cover = abs(doc.querySelector(".post-body img")?.attr("src"));
    const desc = (doc.querySelector(".post-body p")?.text() || "").trim();

    return {
      id,
      title,
      cover,
      description: desc,
    };
  },

  async chapters(id) {
    const doc = await getDoc("/" + id);
    const title = (doc.querySelector(".post-title, h1")?.text() || "الفصل كامل").trim();
    return [
      {
        id: id,
        chapter: "1",
        title: title,
      }
    ];
  },

  async pageUrls(chapterId) {
    const doc = await getDoc("/" + chapterId);
    const images = [];
    doc.querySelectorAll(".post-body img, .entry-content img").forEach((img) => {
      const src = abs(img.attr("src") || img.attr("data-src"));
      if (src && !images.includes(src)) {
        images.push(src);
      }
    });
    return images;
  },

  async tags() {
    return [
      { id: "مارفل", name: "مارفل (Marvel)", group: "الناشر" },
      { id: "دي سي", name: "دي سي (DC)", group: "الناشر" },
      { id: "باتمان", name: "باتمان (Batman)", group: "شخصيات" },
      { id: "سوبرمان", name: "سوبرمان (Superman)", group: "شخصيات" },
      { id: "سبايدرمان", name: "سبايدرمان (Spider-Man)", group: "شخصيات" },
    ];
  }
};

return plugin;
