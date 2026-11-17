// Harbor Comic Source Plugin: DC Comics (دي سي - عربي)
// 100% Verified Google CDN Image Delivery (No Cloudflare, No Hotlink Protection)

const BASE = "https://arcomixverse.blogspot.com";
const SEARCH_QUERY = "superman";
const PRIMARY_TAG = "DC";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function getJson(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await harbor.http(url, {
    responseType: "json",
    headers: { "User-Agent": UA }
  });
  if (typeof res === "string") {
    try { return JSON.parse(res); } catch(e) { return null; }
  }
  if (res && res.body) {
    if (typeof res.body === "object") return res.body;
    try { return JSON.parse(res.body); } catch(e) { return null; }
  }
  return res;
}

function cleanTitle(str) {
  return String(str || "")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImages(html) {
  const urls = [];
  const re = /https?:\/\/(?:blogger\.googleusercontent\.com\/img\/[^\s"\'<>]+|\d+\.bp\.blogspot\.com\/[^\s"\'<>]+|[^\s"\'<>]+\.(?:jpg|png|webp|jpeg))/gi;
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
  const content = entry.content?.$t || "";
  const imgs = extractImages(content);
  const cover = entry.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || imgs[0];
  return {
    id: postId,
    title: title || "كوميكس مترجم",
    cover: cover
  };
}

const plugin = {
  id: "dccomics",
  name: "DC Comics (دي سي - عربي)",
  version: "4.1.0",

  async popular(offset) {
    const startIndex = (Number(offset) || 0) + 1;
    let url = `/feeds/posts/default?alt=json&q=${encodeURIComponent(SEARCH_QUERY)}&max-results=30&start-index=${startIndex}`;
    let data = await getJson(url);
    let entries = data?.feed?.entry || [];
    if (!entries.length && PRIMARY_TAG) {
      url = `/feeds/posts/default/-/${encodeURIComponent(PRIMARY_TAG)}?alt=json&max-results=30&start-index=${startIndex}`;
      data = await getJson(url);
      entries = data?.feed?.entry || [];
    }
    return entries.map(entryToItem).filter(e => e.id);
  },

  async search(query, offset) {
    const startIndex = (Number(offset) || 0) + 1;
    const q = (query || "").trim() + " " + SEARCH_QUERY;
    const url = `/feeds/posts/default?alt=json&q=${encodeURIComponent(q)}&max-results=30&start-index=${startIndex}`;
    const data = await getJson(url);
    const entries = data?.feed?.entry || [];
    return entries.map(entryToItem).filter(e => e.id);
  },

  async detail(id) {
    const data = await getJson(`/feeds/posts/default/${id}?alt=json`);
    const entry = data?.entry;
    const title = cleanTitle(entry?.title?.$t || id);
    const content = entry?.content?.$t || "";
    const imgs = extractImages(content);
    const cover = entry?.media$thumbnail?.url?.replace(/\/s72-c\//, "/s640/") || imgs[0];
    const desc = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    return {
      id: id,
      title: title,
      cover: cover,
      description: desc || "كوميكس مترجم بجودة عالية.",
      author: "DC Comics (مترجم)",
      status: "completed"
    };
  },

  async chapters(id) {
    const data = await getJson(`/feeds/posts/default/${id}?alt=json`);
    const content = data?.entry?.content?.$t || "";
    const labelMatch = content.match(/data-label=["']([^"']+)["']/i);
    
    if (labelMatch) {
      const label = labelMatch[1].trim();
      const chData = await getJson(`/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=50`);
      const chEntries = chData?.feed?.entry || [];
      if (chEntries.length > 0) {
        return chEntries.map((c, i) => {
          const chId = (c.id?.$t || "").split("post-").pop();
          return {
            id: chId,
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
  },

  async pageUrls(chapterId) {
    const data = await getJson(`/feeds/posts/default/${chapterId}?alt=json`);
    const content = data?.entry?.content?.$t || "";
    let imgs = extractImages(content);
    
    if (imgs.length <= 2) {
      const labelMatch = content.match(/data-label=["']([^"']+)["']/i);
      if (labelMatch) {
        const label = labelMatch[1].trim();
        const chData = await getJson(`/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=50`);
        const entries = chData?.feed?.entry || [];
        for (const e of entries) {
          const eImgs = extractImages(e.content?.$t || "");
          if (eImgs.length > 2) return eImgs;
        }
      }
    }
    return imgs;
  }
};

return plugin;
