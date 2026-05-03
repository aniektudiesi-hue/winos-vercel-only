module.exports = async function handler(req, res) {
  const city = String(req.query.city || "Delhi").trim();
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const place = (await geo.json()).results?.[0];
    if (!place) return res.status(404).json({ detail: "City not found" });
    const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m`);
    const current = (await weather.json()).current || {};
    res.status(200).json({
      city: place.name,
      country: place.country || "",
      temp_c: Math.round(current.temperature_2m ?? 0),
      feels_c: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      wind_kmph: Math.round(current.wind_speed_10m ?? 0),
      description: "Current conditions"
    });
  } catch (error) {
    res.status(500).json({ detail: error.message || "Weather failed" });
  }
};
