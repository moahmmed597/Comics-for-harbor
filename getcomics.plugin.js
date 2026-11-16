// Harbor Comic Source Plugin: GetComics (getcomics.org)
// Major release portal for DC, Marvel, Image, Dark Horse comics

const BASE = "https://getcomics.org";

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
    .replace(/&quot;/g, '"')
    .trim();
}

const plugin = {
  id: "getcomics",
  name: "GetComics (English)",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 20) + 1;
    const posts = await getJson("/wp-json/wp/v2/posts?per_page=20&page=" + page);
    return (posts || []).map((p) => {
      const cover = p.jetpack_featured_media_url ||
                    p.yoast_head_json?.og_image?.[0]?.url ||
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
      const cover = p.jetpack_featured_media_url ||
                    p.yoast_head_json?.og_image?.[0]?.url ||
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
    const cover = p.jetpack_featured_media_url ||
                  p.yoast_head_json?.og_image?.[0]?.url ||
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
        chapter: "Issue",
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
      if (url && !images.includes(url) && !url.includes("pubadx") && !url.includes("avatar")) {
        images.push(url);
      }
    }
    return images;
  },

  async tags() {
    return [
      { id: "marvel", name: "Marvel", group: "Publisher" },
      { id: "dc", name: "DC Comics", group: "Publisher" },
      { id: "image", name: "Image Comics", group: "Publisher" },
      { id: "dark-horse", name: "Dark Horse", group: "Publisher" },
    ];
  }
};

return plugin;
