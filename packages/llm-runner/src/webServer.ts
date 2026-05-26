import { createReadStream } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";

import type { ReplConfig } from "./config.js";
import { createRunnerSession } from "./runnerSession.js";

export async function runWebServer(config: ReplConfig): Promise<void> {
  const session = await createRunnerSession(config);
  const distPath = config.webUiDistPath ? resolve(config.webUiDistPath) : undefined;
  const server = createServer(async (request, response) => {
    try {
      const method = request.method ?? "GET";
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

      if (url.pathname === "/api/session" && method === "GET") {
        return respondJson(response, 200, await session.getSnapshot());
      }

      if (url.pathname === "/api/turns" && method === "POST") {
        const body = await readJsonBody(request);
        const inputText = typeof body.inputText === "string" ? body.inputText.trim() : "";
        if (!inputText) {
          return respondJson(response, 400, {
            error: {
              code: "missing-input",
              message: "inputText must be a non-empty string"
            }
          });
        }

        const result = await session.submitTurn(inputText);
        return respondJson(response, 200, result);
      }

      if (url.pathname === "/api/usage" && method === "GET") {
        return respondJson(response, 200, (await session.getSnapshot()).usage);
      }

      if (method !== "GET") {
        return respondJson(response, 405, {
          error: {
            code: "method-not-allowed",
            message: `Unsupported method "${method}"`
          }
        });
      }

      if (distPath && (await exists(distPath))) {
        return serveStaticAsset(distPath, url.pathname, response);
      }

      return respondHtml(
        response,
        200,
        [
          "<!doctype html>",
          "<html lang=\"de\">",
          "<head><meta charset=\"utf-8\"><title>worlddesc web</title></head>",
          "<body>",
          "<h1>worlddesc Web API laeuft</h1>",
          "<p>Die lokale Session-API ist aktiv, aber es wurden noch keine gebauten Web-Assets gefunden.</p>",
          "<p>Erwarteter Dist-Pfad: ",
          distPath ?? "(nicht gesetzt)",
          "</p>",
          "</body>",
          "</html>"
        ].join("")
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return respondJson(response, 500, {
        error: {
          code: "internal-error",
          message
        }
      });
    }
  });

  await new Promise<void>((resolveStart) => {
    server.listen(config.webPort, resolveStart);
  });

  process.stdout.write(`Web server: http://localhost:${config.webPort}\n`);
  process.stdout.write(`World: ${config.worldPath}\n`);
  process.stdout.write(`Narrative mix: ${config.narrativeGuideMixPath ?? "none"}\n`);
  process.stdout.write(`Knowledge dir: ${config.knowledgeDirPath ?? "none"}\n`);
  process.stdout.write(`Model: ${config.model}\n`);
  process.stdout.write(`API mode: ${config.apiMode}\n`);
  process.stdout.write(`Static UI: ${distPath ?? "none"}\n`);
  process.stdout.write("Press Ctrl+C to stop.\n");

  const shutdown = async () => {
    await session.dispose();
    await new Promise<void>((resolveStop, rejectStop) => {
      server.close((error) => {
        if (error) {
          rejectStop(error);
          return;
        }

        resolveStop();
      });
    });
  };

  await new Promise<void>((resolveSignal, rejectSignal) => {
    const onSignal = () => {
      cleanup();
      void shutdown().then(resolveSignal, rejectSignal);
    };

    const onError = (error: Error) => {
      cleanup();
      void shutdown().then(() => rejectSignal(error), rejectSignal);
    };

    const cleanup = () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      server.off("error", onError);
    };

    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    server.on("error", onError);
  });
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw) as Record<string, unknown>;
}

async function serveStaticAsset(distPath: string, pathname: string, response: ServerResponse<IncomingMessage>): Promise<void> {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const targetPath = resolve(distPath, relativePath);
  if (!targetPath.startsWith(resolve(distPath))) {
    respondHtml(response, 403, "Forbidden");
    return;
  }

  if (!(await exists(targetPath))) {
    const spaFallback = join(distPath, "index.html");
    if (!(await exists(spaFallback))) {
      respondHtml(response, 404, "Not found");
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    createReadStream(spaFallback).pipe(response);
    return;
  }

  response.writeHead(200, { "content-type": contentTypeFor(targetPath) });
  createReadStream(targetPath).pipe(response);
}

function respondJson(response: ServerResponse<IncomingMessage>, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function respondHtml(response: ServerResponse<IncomingMessage>, statusCode: number, html: string): void {
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(html);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function contentTypeFor(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}
