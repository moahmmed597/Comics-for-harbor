// Harbor Comic Source Plugin: ArabComics (عرب كوميكس)
// The largest Arabic comic forum & translation archive

const BASE = "https://arabcomics.net";

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

function cleanTitle(str) {
  return (str || "")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .trim();
}

const plugin = {
  id: "arabcomics",
  name: "عرب كوميكس (ArabComics)",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 20) + 1;
    const posts = await getJson("/wp-json/wp/v2/posts?per_page=20&page=" + page);
    return (posts || []).map((p) => {
      const cover = p.aioseo_head?.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ||
                    p.content?.rendered?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
      return {
        id: String(p.id),
        title: cleanTitle(p.title?.rendered),
        cover: abs(cover),
      };
    });
  },

  async search(query, offset) {
    const page = Math.floor((Number(offset) || 0) / 20) + 1;
    const posts = await getJson("/wp-json/wp/v2/posts?search=" + encodeURIComponent(query) + "&per_page=20&page=" + page);
    return (posts || []).map((p) => {
      const cover = p.aioseo_head?.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ||
                    p.content?.rendered?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
      return {
        id: String(p.id),
        title: cleanTitle(p.title?.rendered),
        cover: abs(cover),
      };
    });
  },

  async detail(id) {
    const p = await getJson("/wp-json/wp/v2/posts/" + id);
    const cover = p.aioseo_head?.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ||
                  p.content?.rendered?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    const desc = p.excerpt?.rendered?.replace(/<[^>]+>/g, "").trim();

    return {
      id: String(p.id),
      title: cleanTitle(p.title?.rendered),
      cover: abs(cover),
      description: desc,
    };
  },

  async chapters(id) {
    const p = await getJson("/wp-json/wp/v2/posts/" + id);
    return [
      {
        id: String(p.id),
        chapter: "1",
        title: cleanTitle(p.title?.rendered),
      }
    ];
  },

  async pageUrls(chapterId) {
    const p = await getJson("/wp-json/wp/v2/posts/" + chapterId);
    const html = p.content?.rendered || "";
    const images = [];
    const re = /<img[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const url = abs(m[1]);
      if (url && !images.includes(url)) images.push(url);
    }
    return images;
  },

  async tags() {
    return [
      { id: "dc", name: "دي سي (DC Comics)", group: "الناشر" },
      { id: "marvel", name: "مارفل (Marvel)", group: "الناشر" },
      { id: "european", name: "الكوميكس الأوروبي (تانتان)", group: "القسم" },
      { id: "mickey", name: "ميكي وبطوط", group: "ديزني" },
    ];
  }
};

return plugin;
