import { createApp } from "./api/index.ts";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

async function start() {
  console.log("Starting server process...");
  const app = await createApp();
  const PORT = 3000;

  const isProd = process.env.NODE_ENV === "production";
  const distExists = fs.existsSync(path.join(process.cwd(), "dist"));
  console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}, isProd=${isProd}, distExists=${distExists}`);

  if (!isProd || !distExists) {
    console.log("Starting Vite in middleware/development fallback mode...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware integrated successfully.");
    } catch (e) {
      console.error("Failed to start Vite server:", e);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Studio Dev Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  start();
}

export default createApp;
