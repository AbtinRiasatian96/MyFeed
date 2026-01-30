export interface PageMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;
  item_type: string;
  author: string | null;
  author_image: string | null;
  content: string | null;
}

function detectType(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("linkedin.com")) return "linkedin";
  if (hostname.includes("twitter.com") || hostname.includes("x.com"))
    return "twitter";
  return "article";
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

function extractOg(html: string, property: string): string | null {
  // Try property="og:xxx" content="..."
  const r1 = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m1 = html.match(r1);
  if (m1) return decodeHtmlEntities(m1[1]);

  // Try content="..." property="og:xxx" (reversed attribute order)
  const r2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    "i"
  );
  const m2 = html.match(r2);
  if (m2) return decodeHtmlEntities(m2[1]);

  return null;
}

function extractMeta(html: string, name: string): string | null {
  const r1 = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m1 = html.match(r1);
  if (m1) return decodeHtmlEntities(m1[1]);

  const r2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
    "i"
  );
  const m2 = html.match(r2);
  if (m2) return decodeHtmlEntities(m2[1]);

  return null;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    return await response.text();
  } catch {
    return null;
  }
}

function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchTwitterPost(url: string): Promise<Partial<PageMetadata>> {
  const tweetId = extractTweetId(url);
  if (!tweetId) return {};

  // Use Twitter's syndication API to get tweet data
  try {
    const apiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=0`;
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        author: data.user?.name || null,
        author_image: data.user?.profile_image_url_https || null,
        content: data.text || null,
        image:
          data.mediaDetails?.[0]?.media_url_https ||
          data.photos?.[0]?.url ||
          null,
        title: data.user?.name ? `${data.user.name} on X` : null,
      };
    }
  } catch {
    // Fall through to oEmbed
  }

  // Fallback: oEmbed API
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      // Extract text from the HTML response
      const htmlContent: string = data.html || "";
      const textMatch = htmlContent.match(
        /<blockquote[^>]*><p[^>]*>([\s\S]*?)<\/p>/i
      );
      const text = textMatch
        ? textMatch[1].replace(/<[^>]+>/g, "").trim()
        : null;

      return {
        author: data.author_name || null,
        content: text,
        title: data.author_name ? `${data.author_name} on X` : null,
      };
    }
  } catch {
    // Fall through
  }

  return {};
}

async function fetchLinkedInPost(
  url: string
): Promise<Partial<PageMetadata>> {
  const html = await fetchHtml(url);
  if (!html) return {};

  const result: Partial<PageMetadata> = {};

  // LinkedIn puts the post content in og:description
  const ogDesc = extractOg(html, "og:description");
  if (ogDesc) {
    result.content = ogDesc;
  }

  // og:title often has the author name followed by " on LinkedIn: ..." or similar
  const ogTitle = extractOg(html, "og:title");
  if (ogTitle) {
    // Patterns: "Author Name on LinkedIn: post text" or "Author Name - post text"
    const linkedInAuthor = ogTitle.match(
      /^(.+?)\s+(?:on LinkedIn|posted on|–|-|\|)/i
    );
    if (linkedInAuthor) {
      result.author = linkedInAuthor[1].trim();
    } else {
      result.author = ogTitle;
    }
    result.title = ogTitle;
  }

  const ogImage = extractOg(html, "og:image");
  if (ogImage) {
    result.image = ogImage;
  }

  // Try to get author profile image from the page
  // LinkedIn sometimes includes it in a structured data block
  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd.author?.image?.contentUrl) {
        result.author_image = jsonLd.author.image.contentUrl;
      }
      if (jsonLd.author?.name && !result.author) {
        result.author = jsonLd.author.name;
      }
      if (jsonLd.articleBody && !result.content) {
        result.content = jsonLd.articleBody;
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  return result;
}

export async function fetchMetadata(url: string): Promise<PageMetadata> {
  const itemType = detectType(url);
  const parsedUrl = new URL(url);
  const source = parsedUrl.hostname.replace("www.", "");

  const result: PageMetadata = {
    title: null,
    description: null,
    image: null,
    source,
    item_type: itemType,
    author: null,
    author_image: null,
    content: null,
  };

  if (itemType === "twitter") {
    // Embeds handle rendering — just save the type and source
    result.source = "x.com";
  } else if (itemType === "linkedin") {
    // Embeds handle rendering — just save the type and source
    result.source = "linkedin.com";
  } else {
    // Generic article
    const html = await fetchHtml(url);
    if (html) {
      result.title =
        extractOg(html, "og:title") ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
        null;
      result.description =
        extractOg(html, "og:description") ||
        extractMeta(html, "description") ||
        null;
      result.image = extractOg(html, "og:image") || null;
      result.author =
        extractMeta(html, "author") ||
        extractOg(html, "article:author") ||
        null;
    }
  }

  return result;
}
