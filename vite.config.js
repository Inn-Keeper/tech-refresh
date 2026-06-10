import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Dev-only persistence: pages read and write JSON files in src/ through these
// endpoints, so app data lives in git-trackable files.
function jsonFileApi(route, relPath, validate) {
  const file = fileURLToPath(new URL(relPath, import.meta.url));
  return {
    name: `json-api${route.replaceAll("/", "-")}`,
    configureServer(server) {
      server.middlewares.use(route, async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        try {
          if (req.method === "GET") {
            res.end(await readFile(file, "utf8"));
            return;
          }
          if (req.method === "PUT") {
            let body = "";
            for await (const chunk of req) body += chunk;
            const data = JSON.parse(body);
            if (!validate(data)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid payload shape" }));
              return;
            }
            await writeFile(file, JSON.stringify(data, null, 2) + "\n");
            res.end(JSON.stringify(data));
            return;
          }
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    jsonFileApi("/api/contacts", "./src/contacts.json", Array.isArray),
    jsonFileApi("/api/scores", "./src/scores.json", (d) => d && typeof d === "object" && !Array.isArray(d)),
    jsonFileApi("/api/stories", "./src/stories.json", Array.isArray),
  ],
});
