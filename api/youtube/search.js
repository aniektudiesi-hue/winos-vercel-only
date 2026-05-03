function clean(value = "") {
  return String(value).replace(/\\u0026/g, "&").replace(/\\"/g, '"').trim();
}

module.exports = async function handler(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(200).json({ results: [] });

  try {
    const upstream = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 WinOS",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const html = await upstream.text();
    const seen = new Set();
    const results = [];
    const re = /"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,900}?"title":\{"runs":\[\{"text":"([^"]+)"/g;
    let match;
    while ((match = re.exec(html)) && results.length < 12) {
      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);
      const title = clean(match[2]);
      results.push({
        id,
        title,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        embed_url: `https://www.youtube.com/embed/${id}?autoplay=1`
      });
    }
    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ detail: error.message || "YouTube search failed" });
  }
};
