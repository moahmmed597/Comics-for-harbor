// Harbor Comic Source Plugin: Comics Book In Arabic (كوميكس بوك بالعربي)
// High quality Arabic translated comics (Batman, Superman, Wonder Woman, Justice League)

const BASE = "https://comicsbookinarabic.blogspot.com";

async function getJson(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await harbor.http(url, {
    responseType: "json",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
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
  const re = /https?:\/\/(?:blogger\.googleusercontent\.com\/img\/[^\s"\'<>]+|[^\s"\'<>]+\.(?:jpg|png|webp|jpeg))/gi;
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
  id: "comicsbookinarabic",
  name: "كوميكس بوك بالعربي (Comics Book In Arabic)",
  version: "4.0.0",

  async popular(offset) {
    const startIndex = (Number(offset) || 0) + 1;
    const url = `/feeds/posts/default?alt=json&max-results=25&start-index=${startIndex}`;
    const data = await getJson(url);
    const entries = data?.feed?.entry || [];
    return entries.map(entryToItem).filter(e => e.id);
  },

  async search(query, offset) {
    const startIndex = (Number(offset) || 0) + 1;
    const url = `/feeds/posts/default?alt=json&q=${encodeURIComponent(query)}&max-results=25&start-index=${startIndex}`;
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
      author: "Comics Book In Arabic",
      status: "completed"
    };
  },

  async chapters(id) {
    const data = await getJson(`/feeds/posts/default/${id}?alt=json`);
    const title = cleanTitle(data?.entry?.title?.$t || "العدد كامل");
    return [
      {
        id: id,
        chapter: "1",
        title: title
      }
    ];
  },

  async pageUrls(chapterId) {
    const data = await getJson(`/feeds/posts/default/${chapterId}?alt=json`);
    const content = data?.entry?.content?.$t || "";
    return extractImages(content);
  }
};

return plugin;
