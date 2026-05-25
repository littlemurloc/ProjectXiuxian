const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/health") {
    send(res, 200, "ok\n");
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const decoded = decodeURIComponent(requested);
  const filePath = path.normalize(path.join(root, decoded));

  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden\n");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found\n");
      return;
    }

    send(res, 200, data, types[path.extname(filePath)] || "application/octet-stream");
  });
});

server.listen(port, host, () => {
  console.log(`Lingbao prototype server running at http://127.0.0.1:${port}/`);
});
