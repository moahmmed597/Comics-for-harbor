// Harbor Comic Source Plugin: الكوميكس بالعربية (Arabic Comics)
// Complete graphic novels: Batman Killing Joke, Three Jokers, Justice League, Venom Rex, DCeased

const BASE = "https://comicsbookinarabic.blogspot.com";

async function getJson(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await harbor.http(url, { responseType: "json" });
  if (!res) throw new Error("Failed to fetch JSON from " + url);
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

function extractImages(html) {
  const urls = [];
  const re = /https?:\/\/(?:blogger\.googleusercontent\.com\/img\/[^\s"\'<>]+|bp\.blogspot\.com\/[^\s"\'<>]+|[^\s"\'<>]+\.(?:jpg|png|webp|jpeg))/gi;
  let m;
  while ((m = re.exec(html || "")) !== null) {
    let u = m[0];
    if (u.includes("s72-c")) u = u.replace("/s72-c/", "/s1600/");
    if (!urls.includes(u) && !u.includes("draggable.png") && !u.includes("picture_not_available") && !u.includes("unnamed.png") && !u.includes("gradient.png") && !u.includes("favicon")) {
      urls.push(u);
    }
  }
  return urls;
}

function entryToItem(entry) {
  const postId = (entry.id?.$t || "").split("post-").pop();
  const title = cleanTitle(entry.title?.$t);
  const content = entry.content?.$t || "";
  const imgs = extractImages(content);
  const cover = entry.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || imgs[0];
  return {
    id: postId,
    title: title || "كوميكس",
    cover: abs(cover),
  };
}

const plugin = {
  id: "cbia",
  name: "الكوميكس بالعربية (Arabic Comics)",

  async popular(offset) {
    const startIndex = (Number(offset) || 0) + 1;
    const url = "/feeds/posts/default?alt=json&max-results=30&start-index=" + startIndex;
    const data = await getJson(url);
    const entries = data.feed?.entry || [];
    return entries.map(entryToItem).filter((e) => e.id);
  },

  async search(query, offset) {
    const startIndex = (Number(offset) || 0) + 1;
    const url = "/feeds/posts/default?alt=json&q=" + encodeURIComponent(query) + "&max-results=30&start-index=" + startIndex;
    const data = await getJson(url);
    const entries = data.feed?.entry || [];
    return entries.map(entryToItem).filter((e) => e.id);
  },

  async detail(id) {
    const data = await getJson("/feeds/posts/default/" + id + "?alt=json");
    const entry = data.entry;
    const title = cleanTitle(entry?.title?.$t || id);
    const content = entry?.content?.$t || "";
    const imgs = extractImages(content);
    const cover = entry?.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || imgs[0];
    const desc = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    return {
      id,
      title,
      cover: abs(cover),
      description: desc,
    };
  },

  async chapters(id) {
    const data = await getJson("/feeds/posts/default/" + id + "?alt=json");
    const title = cleanTitle(data.entry?.title?.$t || "الرواية كاملة");
    return [
      {
        id: id,
        chapter: "1",
        title: title,
      }
    ];
  },

  async pageUrls(chapterId) {
    const data = await getJson("/feeds/posts/default/" + chapterId + "?alt=json");
    const content = data.entry?.content?.$t || "";
    return extractImages(content);
  },

  async tags() {
    return [
      { id: "batman", name: "باتمان (Batman)", group: "الأبطال" },
      { id: "superman", name: "سوبرمان (Superman)", group: "الأبطال" },
      { id: "marvel", name: "مارفل (Marvel)", group: "الناشر" },
      { id: "dc", name: "دي سي (DC Comics)", group: "الناشر" },
      { id: "theavengers", name: "أفنجرز (Avengers)", group: "فرق" },
      { id: "justice league", name: "فرقة العدالة (Justice League)", group: "فرق" },
    ];
  }
};

return plugin;
