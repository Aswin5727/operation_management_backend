const app = require("./app");
const config = require("./src/config/env");

function startServer() {
  return app.listen(config.port, () => {
    console.log(`Backend server running on port ${config.port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
