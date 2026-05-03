function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

module.exports = async function handler(req, res) {
  const target = String(req.query.url || "").trim();
  let url;
  try {
    url = new URL(target);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported URL");
  } catch {
    return res.status(400).send("<p>Invalid URL.</p>");
  }

  try {
    const upstream = await fetch(url.href, {
      headers: {
        "User-Agent": "Mozilla/5.0 WinOS",
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
      }
    });
    const type = upstream.headers.get("content-type") || "";
    if (!type.includes("text/html")) {
      const text = await upstream.text();
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(text);
    }
    let html = await upstream.text();
    html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/ig, "");
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${escapeHtml(url.origin)}${url.pathname.includes("/") ? escapeHtml(url.pathname.replace(/\/[^/]*$/, "/")) : "/"}">`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.status(200).send(html);
  } catch (error) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`<!doctype html><title>Could not load</title><body style="font-family:system-ui;padding:24px"><h2>Could not load page</h2><p>${escapeHtml(error.message || "Request failed")}</p><p><a href="${escapeHtml(url.href)}" target="_blank" rel="noopener">Open original page</a></p></body>`);
  }
};
