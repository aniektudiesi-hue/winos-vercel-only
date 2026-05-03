module.exports = function handler(_req, res) {
  res.status(200).json({
    status: "ok",
    app: "WebOS Glass",
    db: "browser-local",
    features: ["desktop-state", "virtual-files", "mp4-wallpaper", "roanime", "tic-tac-toe", "snake", "web-search", "youtube-search", "weather"]
  });
};
