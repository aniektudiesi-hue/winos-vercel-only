module.exports = function handler(_req, res) {
  res.status(200).json({
    status: "ok",
    app: "WinOS",
    db: "browser-local",
    features: ["desktop-state", "virtual-files", "web-search", "youtube-search", "weather"]
  });
};
