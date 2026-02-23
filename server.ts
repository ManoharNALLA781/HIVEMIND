import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("scans.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    indicators TEXT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/scans", (req, res) => {
    const scans = db.prepare("SELECT * FROM scans ORDER BY created_date DESC").all();
    const parsedScans = scans.map((scan: any) => ({
      ...scan,
      indicators: JSON.parse(scan.indicators)
    }));
    res.json(parsedScans);
  });

  app.post("/api/scans", (req, res) => {
    const { target, risk_score, indicators } = req.body;
    const info = db.prepare(
      "INSERT INTO scans (target, risk_score, indicators) VALUES (?, ?, ?)"
    ).run(target, risk_score, JSON.stringify(indicators));
    
    const newScan = db.prepare("SELECT * FROM scans WHERE id = ?").get(info.lastInsertRowid);
    res.json({
      ...newScan,
      indicators: JSON.parse((newScan as any).indicators)
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
