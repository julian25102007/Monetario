import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");

app.use(express.json());

// Valores aproximados por si la API externa falla (el demo nunca se queda sin datos)
const FALLBACK = {
  USD: 1, MXN: 18.5, EUR: 0.92, GBP: 0.78, CAD: 1.37, JPY: 150, CNY: 7.2, BRL: 5.3,
  ARS: 950, COP: 4100, CLP: 930, PEN: 3.75, GTQ: 7.75, CHF: 0.88, KRW: 1350, INR: 83,
};

// Caché de 1 hora: así no llamamos a la API externa en cada visita
let cache = null;
let cachedAt = 0;
const TTL = 60 * 60 * 1000;

app.get("/api/rates", async (_req, res) => {
  if (cache && Date.now() - cachedAt < TTL) return res.json(cache);
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const d = await r.json();
    if (d.result !== "success") throw new Error("Respuesta inválida de la API");
    cache = { rates: d.rates, updated: d.time_last_update_utc, live: true };
    cachedAt = Date.now();
    res.json(cache);
  } catch (err) {
    console.error("No se pudo obtener tipos de cambio:", err.message);
    res.json({ rates: FALLBACK, updated: null, live: false });
  }
});

// Interesados en Premium (en memoria; en un producto real iría en una base de datos)
const interesados = new Set();

app.post("/api/interes", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Escribe un correo válido." });
  }
  interesados.add(email);
  res.json({ total: interesados.size });
});

// En producción, el mismo servidor entrega la app de React ya compilada
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.use((_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.listen(PORT, () => console.log(`CambioYa en http://localhost:${PORT}`));
