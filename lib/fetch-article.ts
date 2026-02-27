interface ArticleResult {
  title: string;
  content: string;
  url: string;
  excerpt?: string;
}

function isJsHeavySite(url: string): boolean {
  const jsHeavy = ['xiaohongshu.com', 'xhslink.com', 'douyin.com', 'weixin.qq.com'];
  return jsHeavy.some((domain) => url.includes(domain));
}

async function fetchWithReadability(url: string): Promise<ArticleResult> {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
    timeout: 15000,
  } as Parameters<typeof fetch>[1]);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const { JSDOM } = await import('jsdom');
  const { Readability } = await import('@mozilla/readability');

  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (article) {
    return {
      title: article.title || url,
      content: article.textContent || '',
      url,
      excerpt: article.excerpt,
    };
  }

  // Fallback: extract text with cheerio
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();
  const title = $('title').text() || $('h1').first().text() || url;
  const content = $('body').text().replace(/\s+/g, ' ').trim();
  return { title, content, url };
}

async function fetchWithPlaywright(url: string): Promise<ArticleResult> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore playwright is installed globally
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    const content = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, h1, h2, h3, h4, li, span');
      return Array.from(elements)
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join('\n');
    });

    return { title, content, url };
  } finally {
    await browser.close();
  }
}

export async function fetchArticle(url: string): Promise<ArticleResult> {
  if (isJsHeavySite(url)) {
    try {
      return await fetchWithPlaywright(url);
    } catch (e) {
      console.warn('Playwright failed, falling back to fetch:', e);
      return await fetchWithReadability(url);
    }
  }
  return await fetchWithReadability(url);
}

export type { ArticleResult };
