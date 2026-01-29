export interface PageMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;
}

export async function fetchMetadata(url: string): Promise<PageMetadata> {
  const result: PageMetadata = {
    title: null,
    description: null,
    image: null,
    source: null,
  };

  try {
    const parsedUrl = new URL(url);
    result.source = parsedUrl.hostname.replace("www.", "");

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MyFeed/1.0; +https://myfeed.local)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    const html = await response.text();

    // Extract og:title or <title>
    const ogTitle = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    )?.[1];
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    result.title = ogTitle || titleTag || null;

    // Extract og:description or meta description
    const ogDesc = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    )?.[1];
    const metaDesc = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    )?.[1];
    result.description = ogDesc || metaDesc || null;

    // Extract og:image
    const ogImage = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    )?.[1];
    result.image = ogImage || null;
  } catch {
    // If fetch fails, we still have the URL — that's enough
  }

  return result;
}
