import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
export async function serve(port = 0) {
  const dir = fileURLToPath(new URL("../../dist/", import.meta.url));
  const types = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2",
  };
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      ).replace(/^\/ipfs\/folir-test\//, "/");
      if (path.endsWith("/")) path += "index.html";
      const file = resolve(dir, "." + path);
      if (!file.startsWith(resolve(dir) + sep) || !(await stat(file)).isFile())
        throw new Error("not found");
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((done) => server.listen(port, "0.0.0.0", done));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await serve(Number(process.argv[2] || 4173));
  console.log(url);
}
