function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value = "") {
  return decodeHtml(String(value))
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveDuckUrl(raw = "") {
  try {
    const url = new URL(decodeHtml(raw), "https://duckduckgo.com");
    return url.searchParams.get("uddg") || url.href;
  } catch {
    return decodeHtml(raw);
  }
}

function isUsableUrl(url = "") {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (parsed.hostname.includes("duckduckgo.com") && parsed.pathname.includes("/y.js")) return false;
    return true;
  } catch {
    return false;
  }
}

function fallbackResults(q) {
  const encoded = encodeURIComponent(q);
  return [
    {
      title: `Search DuckDuckGo for ${q}`,
      url: `https://duckduckgo.com/?q=${encoded}`,
      snippet: "Open the full web results in Chromium."
    },
    {
      title: `Search Google for ${q}`,
      url: `https://www.google.com/search?q=${encoded}`,
      snippet: "Open Google results in a browser tab."
    },
    {
      title: `Search YouTube for ${q}`,
      url: `https://www.youtube.com/results?search_query=${encoded}`,
      snippet: "Open YouTube results for this query."
    }
  ];
}

function parseJinaDuck(markdown) {
  const results = [];
  const sections = String(markdown || "").split(/\n## /).slice(1);
  for (const section of sections) {
    const heading = section.match(/^\[([^\]]+)]\(([^)]+)\)/);
    if (!heading) continue;

    const title = cleanText(heading[1]);
    const url = resolveDuckUrl(heading[2]);
    if (!title || !isUsableUrl(url)) continue;

    const links = [...section.matchAll(/(?<!!)\[([^\]]+)]\(([^)]+)\)/g)];
    const snippetLink = links.find(match => {
      const text = cleanText(match[1]);
      return text.length > 35 && !/^https?:\/\//i.test(text) && !/^[\w.-]+\.[a-z]{2,}/i.test(text);
    });
    const snippet = snippetLink ? cleanText(snippetLink[1]) : "";
    if (!results.some(item => item.url === url)) results.push({ title, url, snippet });
    if (results.length >= 10) break;
  }
  return results;
}

function parseDuckHtml(html) {
  const results = [];
  const itemRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[\s\S]*?>([\s\S]*?)<\/a>/g;
  let match;
  while ((match = itemRe.exec(html)) && results.length < 10) {
    const url = resolveDuckUrl(match[1]);
    const title = cleanText(match[2].replace(/<[^>]+>/g, ""));
    const snippet = cleanText(match[3].replace(/<[^>]+>/g, ""));
    if (title && isUsableUrl(url) && !results.some(item => item.url === url)) {
      results.push({ title, url, snippet });
    }
  }
  return results;
}

function parseInstantAnswer(data) {
  const results = [];
  const addTopic = topic => {
    if (!topic) return;
    if (topic.FirstURL && topic.Text) {
      results.push({ title: topic.Text.split(" - ")[0], url: topic.FirstURL, snippet: topic.Text });
    }
    if (Array.isArray(topic.Topics)) topic.Topics.forEach(addTopic);
  };
  if (data.AbstractURL && data.Heading) {
    results.push({ title: data.Heading, url: data.AbstractURL, snippet: data.AbstractText || "" });
  }
  (data.RelatedTopics || []).forEach(addTopic);
  return results.slice(0, 10);
}

module.exports = async function handler(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(200).json({ results: [] });

  try {
    const jinaUrl = `https://r.jina.ai/http://r.jina.ai/http://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const jina = await fetch(jinaUrl, { headers: { "User-Agent": "WinOS Search" } });
    if (jina.ok) {
      const results = parseJinaDuck(await jina.text());
      if (results.length) return res.status(200).json({ results });
    }

    const upstream = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "Mozilla/5.0 WinOS" }
    });
    if (upstream.ok) {
      const results = parseDuckHtml(await upstream.text());
      if (results.length) return res.status(200).json({ results });
    }

    const instant = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`);
    if (instant.ok) {
      const results = parseInstantAnswer(await instant.json());
      if (results.length) return res.status(200).json({ results });
    }

    res.status(200).json({ results: fallbackResults(q) });
  } catch (error) {
    res.status(200).json({ results: fallbackResults(q), warning: error.message || "Search fallback used" });
  }
};
