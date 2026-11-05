import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { pickPrimaryUrl, splitCsvValues } from "../src/config/env.js";

const backendRoot = new URL("..", import.meta.url);

function runNodeScript(source, env = {}) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: backendRoot,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

test("frontend URL helpers parse comma-separated values", () => {
  assert.deepEqual(splitCsvValues(" https://one.example.com , https://two.example.com "), [
    "https://one.example.com",
    "https://two.example.com",
  ]);
  assert.equal(
    pickPrimaryUrl("https://one.example.com,https://two.example.com"),
    "https://one.example.com",
  );
});

test("backend keeps one primary frontend URL and separate CORS origins", () => {
  const result = runNodeScript(
    `
      const originalStdoutWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = () => true;

      const { default: config } = await import('./src/config/env.js');

      process.stderr.write(JSON.stringify({
        frontendUrl: config.frontendUrl,
        corsOrigins: config.corsOrigins,
      }));

      process.stdout.write = originalStdoutWrite;
    `,
    {
      FRONTEND_URL: "https://main.example.com",
      CORS_ORIGINS: "https://main.example.com,https://second.example.com",
      NODE_ENV: "test",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const combinedOutput = `${result.stdout}${result.stderr}`.trim();
  const jsonStart = combinedOutput.lastIndexOf("{");
  const jsonEnd = combinedOutput.lastIndexOf("}");
  assert.ok(jsonStart >= 0 && jsonEnd > jsonStart, combinedOutput);
  const payload = JSON.parse(combinedOutput.slice(jsonStart, jsonEnd + 1));
  assert.equal(payload.frontendUrl, "https://main.example.com");
  assert.equal(payload.corsOrigins, "https://main.example.com,https://second.example.com");
});

test("backend CORS accepts the second live frontend origin", () => {
  const result = runNodeScript(
    `
      import http from 'node:http';

      const originalStdoutWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = () => true;

      const { default: app } = await import('./app.js');

      const server = http.createServer(app);

      await new Promise((resolve) => server.listen(0, resolve));
      const { port } = server.address();

      try {
        const response = await fetch(\`http://127.0.0.1:\${port}/\`, {
          headers: {
            Origin: 'https://second.example.com',
          },
        });

        process.stderr.write(JSON.stringify({
          status: response.status,
          allowOrigin: response.headers.get('access-control-allow-origin'),
        }));
      } finally {
        await new Promise((resolve) => server.close(resolve));
        process.stdout.write = originalStdoutWrite;
      }
    `,
    {
      FRONTEND_URL: "https://main.example.com",
      CORS_ORIGINS: "https://main.example.com,https://second.example.com",
      NODE_ENV: "test",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stderr.trim());
  assert.equal(payload.status, 200);
  assert.equal(payload.allowOrigin, "https://second.example.com");
});
