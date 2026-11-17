// Harbor Comic Source Plugin: Indie & Sci-Fi (سلاسل وأبطال)
// Ben 10, Invincible, The Boys, The Walking Dead, Aliens vs Avengers, TMNT, Image Comics

const BASE = "https://arcomixverse.blogspot.com";
const FILTER_TAG = "IMAGE";

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
  const re = /https?:\/\/(?:blogger\.googleusercontent\.com\/img\/[^\s"\'<>]+|[^\s"\'<>]+\.(?:jpg|png|webp))/gi;
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

function entryToItem(entry) {
  const postId = (entry.id?.$t || "").split("post-").pop();
  const title = cleanTitle(entry.title?.$t);
  const cover = entry.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || 
                extractImages(entry.content?.$t)[0];
  return {
    id: postId,
    title: title || "كوميكس مستقل",
    cover: abs(cover),
  };
}

const plugin = {
  id: "indie",
  name: "Indie & Sci-Fi (سلاسل وأبطال)",

  async popular(offset) {
    const startIndex = (Number(offset) || 0) + 1;
    const url = "/feeds/posts/default/-/" + encodeURIComponent(FILTER_TAG) + "?alt=json&max-results=30&start-index=" + startIndex;
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
    const cover = entry?.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || 
                  extractImages(content)[0];
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
    const content = data.entry?.content?.$t || "";
    const labelMatch = content.match(/data-label=["']([^"']+)["']/i);
    
    if (labelMatch) {
      const label = labelMatch[1].trim();
      const chData = await getJson("/feeds/posts/default/-/" + encodeURIComponent(label) + "?alt=json&max-results=50");
      const chEntries = chData.feed?.entry || [];
      if (chEntries.length > 0) {
        return chEntries.map((c, i) => {
          const chId = (c.id?.$t || "").split("post-").pop();
          const chTitle = cleanTitle(c.title?.$t || ("العدد " + (i + 1)));
          return {
            id: chId,
            chapter: String(i + 1),
            title: chTitle,
          };
        });
      }
    }

    return [
      {
        id: id,
        chapter: "1",
        title: cleanTitle(data.entry?.title?.$t || "العدد كامل"),
      }
    ];
  },

  async pageUrls(chapterId) {
    const data = await getJson("/feeds/posts/default/" + chapterId + "?alt=json");
    const content = data.entry?.content?.$t || "";
    let imgs = extractImages(content);
    
    if (imgs.length <= 2) {
      const labelMatch = content.match(/data-label=["']([^"']+)["']/i);
      if (labelMatch) {
        const label = labelMatch[1].trim();
        const chData = await getJson("/feeds/posts/default/-/" + encodeURIComponent(label) + "?alt=json&max-results=50");
        const entries = chData.feed?.entry || [];
        for (const e of entries) {
          const eImgs = extractImages(e.content?.$t || "");
          if (eImgs.length > 2) {
            return eImgs;
          }
        }
      }
    }
    return imgs;
  },

  async tags() {
    return [
      { id: "BEN 10", name: "بن 10 (Ben 10)", group: "سلاسل" },
      { id: "INVINCIBLE", name: "انفينسيبل (Invincible)", group: "سلاسل" },
      { id: "TWD", name: "الموتى السائرون (The Walking Dead)", group: "سلاسل" },
      { id: "IMAGE", name: "إيميج (Image Comics)", group: "الناشر" },
      { id: "DARK HORSE", name: "دارك هورس (Dark Horse)", group: "الناشر" },
    ];
  }
};

return plugin;
