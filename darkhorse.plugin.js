// Harbor Comic Source Plugin: Dark Horse & Cyberpunk (English)
// Direct Western Comics reader (DC, Marvel, Dark Horse, Image)

const BASE = "https://xoxocomic.com";
const CATEGORY_PATH = "/dark-horse-comic";

async function getDoc(path) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await harbor.http(url, { responseType: "text" });
  if (!res || !res.ok) throw new Error("HTTP " + (res ? res.status : "?") + " for " + url);
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
  return String(str || "").replace(/\s+/g, " ").trim();
}

function extractCards(doc) {
  const items = [];
  const seen = new Set();
  const elements = doc.querySelectorAll("div.item") || [];
  for (const el of elements) {
    const a = el.querySelector("h3 a") || el.querySelector("a");
    if (!a) continue;
    const href = a.attr("href") || "";
    if (!href.includes("/comic/")) continue;
    const slug = href.split("/comic/").pop().replace(/\/$/, "");
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const img = el.querySelector("img");
    const rawTitle = a.attr("title") || (img && img.attr("alt")) || a.text() || slug;
    const title = cleanTitle(rawTitle).replace(/Comic$/i, "").trim();
    const cover = img ? (img.attr("data-src") || img.attr("data-original") || img.attr("src")) : undefined;

    items.push({
      id: slug,
      title: title || slug,
      cover: abs(cover)
    });
  }
  return items;
}

const plugin = {
  id: "darkhorse-comics",
  name: "Dark Horse & Cyberpunk (English)",

  async popular(offset) {
    const page = Math.floor((Number(offset) || 0) / 12) + 1;
    const url = CATEGORY_PATH + "?page=" + page;
    const doc = await getDoc(url);
    return extractCards(doc);
  },

  async search(query, offset) {
    const page = Math.floor((Number(offset) || 0) / 12) + 1;
    const url = "/search-comic?keyword=" + encodeURIComponent(query || "") + "&page=" + page;
    const doc = await getDoc(url);
    return extractCards(doc);
  },

  async detail(id) {
    const doc = await getDoc("/comic/" + id);
    const titleEl = doc.querySelector("h1") || doc.querySelector(".title");
    const coverEl = doc.querySelector(".col-image img") || doc.querySelector(".detail-info img") || doc.querySelector("img");
    const descEl = doc.querySelector(".detail-content") || doc.querySelector(".comic-description");

    const cover = coverEl ? (coverEl.attr("data-src") || coverEl.attr("data-original") || coverEl.attr("src")) : undefined;

    return {
      id,
      title: cleanTitle(titleEl ? titleEl.text() : id).replace(/Comic$/i, "").trim(),
      cover: abs(cover),
      description: cleanTitle(descEl ? descEl.text() : "")
    };
  },

  async chapters(id) {
    const doc = await getDoc("/comic/" + id);
    const elements = doc.querySelectorAll("div.list-chapter a") || [];
    const chapters = [];
    const seen = new Set();

    for (const a of elements) {
      const href = a.attr("href") || "";
      if (!href.includes("/issue-") && !href.includes("/full")) continue;
      if (seen.has(href)) continue;
      seen.add(href);

      const title = cleanTitle(a.text()) || "Issue";
      chapters.push({
        id: href,
        chapter: title,
        title: title
      });
    }

    if (!chapters.length) {
      chapters.push({
        id: BASE + "/comic/" + id + "/full",
        chapter: "Full Issue",
        title: "Full Issue"
      });
    }
    return chapters;
  },

  async pageUrls(chapterId) {
    let url = chapterId.startsWith("http") ? chapterId : BASE + (chapterId.startsWith("/") ? "" : "/") + chapterId;
    if (!url.endsWith("/all")) {
      url = url.replace(/\/$/, "") + "/all";
    }

    const doc = await getDoc(url);
    const images = [];
    const elements = doc.querySelectorAll(".page-chapter img, .reading-detail img, div.chapter-image img") || [];

    for (const img of elements) {
      const src = img.attr("data-original") || img.attr("data-src") || img.attr("src");
      if (src && !src.startsWith("data:") && !src.includes("logo.png") && !images.includes(src)) {
        images.push(abs(src));
      }
    }
    return images;
  }
};

return plugin;
