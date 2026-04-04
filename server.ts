import { createApp } from "./api/index.ts";

async function start() {
  const app = await createApp();
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Studio Dev Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  start();
}

export default createApp;
