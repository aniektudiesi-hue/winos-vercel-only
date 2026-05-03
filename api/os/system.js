module.exports = function handler(_req, res) {
  res.status(200).json({
    status: "ok",
    app: "WebOS Glass",
    db: "browser-local",
    features: ["desktop-state", "virtual-files", "video-wallpapers", "roanime", "classic-games", "web-search", "youtube-search", "weather"]
  });
};
