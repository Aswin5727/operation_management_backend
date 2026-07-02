import { fileURLToPath } from "node:url";

import app from "./app.js";
import config from "./src/config/env.js";

function startServer() {
  return app.listen(config.port, () => {
    console.log(`Backend server running on port ${config.port}`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}

export { app, startServer };
