import { randomUUID } from "node:crypto";
import http from "node:http";

type LogLevel = "info" | "error" | "warn" | "debug";

type LoggerFactory = (object: Record<string, unknown>) => Logger;

export type Logger = Record<
  LogLevel,
  (message: string, metadata?: unknown) => void
> & { child: LoggerFactory };

type Handler = () => Promise<string>;

class Request {
  readonly startTime: number;
  readonly logger: Logger;
  readonly method: string;
  readonly path: string;
  readonly headers: http.IncomingHttpHeaders;

  constructor(request: http.IncomingMessage, loggerFactory: LoggerFactory) {
    this.startTime = Date.now();
    this.logger = loggerFactory({ "request-id": randomUUID() });

    if (request.method === undefined) {
      throw new Error("Request received undefined method");
    }
    if (request.url === undefined) {
      throw new Error("Request received undefined url");
    }

    const url = new URL(request.url, `http://${request.headers.host}`);

    this.method = request.method;
    this.path = url.pathname;
    this.headers = request.headers;
  }
}

class Response {
  private readonly response: http.ServerResponse;
  statusCode: number | undefined;
  readonly headers: http.OutgoingHttpHeaders = {};

  constructor(response: http.ServerResponse) {
    this.response = response;
  }

  status(statusCode: number) {
    this.statusCode = statusCode;
    return this;
  }

  send(body: string) {
    this.statusCode ??= 200;
    this.headers["Content-Length"] = Buffer.byteLength(body);
    this.headers["Content-Type"] = "text/plain";

    this.response.writeHead(this.statusCode, this.headers).end(body);
  }
}

export class Server {
  private readonly server: http.Server;
  private readonly logger: Logger;
  private readonly routes = new Map<string, Handler>();

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
    this.server = http.createServer(this.requestListener.bind(this));
  }

  async start({ port }: { port: number }) {
    return new Promise<void>((resolve, reject) => {
      this.server.listen(port);
      this.server.on("listening", () => {
        this.logger.info(`Server is now listening on http://localhost:${port}`);
        resolve();
      });
      this.server.on("error", (error) => {
        reject(new Error(`Server start error: ${error.message}`));
      });
    });
  }

  async stop() {
    return new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(new Error(`Error while closing the server: ${error.message}`));
          return;
        }
        this.logger.info("Server closed");
        resolve();
      });
    });
  }

  get(path: string, handler: Handler) {
    const routeKey = Server.toRouteKey({ method: "GET", path });
    this.logger.debug(`Add new route GET ${path} - ${routeKey}`);
    this.routes.set(routeKey, handler);
  }

  private requestListener(
    serverRequest: http.IncomingMessage,
    serverResponse: http.ServerResponse,
  ) {
    const request = new Request(
      serverRequest,
      this.logger.child.bind(this.logger),
    );
    const response = new Response(serverResponse);

    serverRequest.once("close", () => {
      request.logger.debug("Close event");
      this.requestLogger(request, response);
    });

    const routeKey = Server.toRouteKey({
      method: request.method,
      path: request.path,
    });
    request.logger.debug(`Route key: ${routeKey}`);

    const handler = this.routes.get(routeKey);

    if (!handler) {
      this.notFoundHandler(request, response);
      return;
    }

    handler()
      .then((body) => {
        response.send(body);
      })
      .catch((error) => {
        this.errorHandler(error, request, response);
      });
  }

  private notFoundHandler(request: Request, response: Response) {
    response.status(404).send("Not Found");
  }

  private errorHandler(error: unknown, request: Request, response: Response) {
    request.logger.error("error", error);
    response.status(500).send("Internal Server Error");
  }

  private requestLogger(request: Request, response: Response) {
    const responseTime = Date.now() - request.startTime;

    let logLevel: LogLevel;
    if (response.statusCode && response.statusCode < 400) {
      logLevel = "info";
    } else if (response.statusCode && response.statusCode < 500) {
      logLevel = "warn";
    } else {
      logLevel = "error";
    }

    request.logger[logLevel]("request completed", {
      response: {
        headers: response.headers,
        statusCode: response.statusCode,
      },
      responseTime,
      request: {
        method: request.method,
        path: request.path,
        headers: request.headers,
      },
    });
  }

  private static toRouteKey({
    method,
    path,
  }: {
    method: string;
    path: string;
  }) {
    return `${method}:${path}`.toLowerCase();
  }
}
