import { test, expect, describe, vi, beforeEach } from "vitest";
import { Server, type Logger } from "../src/server.js";
import { getFreePort } from "./helpers.js";

let port: number;
let logger: Logger;
let server: Server;

beforeEach(async () => {
  port = await getFreePort();
  logger = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    child: () => logger,
  };
  server = new Server({ logger });
});

describe("Server", () => {
  describe("start method", () => {
    test("should call logger.info once on successful start", async () => {
      const loggerInfoSpy = vi.spyOn(logger, "info");

      await server.start({ port });

      expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        `Server is now listening on http://localhost:${port}`,
      );
    });

    test("should throw an error if the port is already in use", async () => {
      const server2 = new Server({ logger });
      await server.start({ port });

      const result = async () => {
        await server2.start({ port });
      };

      await expect(result).rejects.toThrowError(
        "Server start error: listen EADDRINUSE: address already in use",
      );
    });
  });

  describe("stop method", () => {
    test("should call logger.info once on successful stop", async () => {
      await server.start({ port });
      const loggerInfoSpy = vi.spyOn(logger, "info");

      await server.stop();

      expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerInfoSpy).toHaveBeenCalledWith("Server closed");
    });

    test("should throw an error if the server is not running", async () => {
      await server.start({ port });
      await server.stop();

      const result = async () => {
        await server.stop();
      };

      await expect(result).rejects.toThrowError(
        "Error while closing the server: Server is not running.",
      );
    });
  });

  describe("get method", () => {
    test("responds with status 200 and correct body for valid request", async () => {
      const path = "/route";
      const body = "hello-world";
      server.get(path, () => Promise.resolve(body));
      await server.start({ port });

      const response = await fetch(`http://localhost:${port}${path}`, {
        method: "GET",
      });
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-length")).toBe(`${body.length}`);
      expect(response.headers.get("content-type")).toBe("text/plain");
      expect(text).toBe(body);
    });

    test("calls logger.info once for a successful request", async () => {
      const body = "hello-world";
      const requestHeaders = {
        "x-custom": "header",
      };
      server.get("/", () => Promise.resolve(body));
      await server.start({ port });
      const loggerInfoSpy = vi.spyOn(logger, "info");

      await fetch(`http://localhost:${port}`, {
        method: "GET",
        headers: requestHeaders,
      });

      expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerInfoSpy).toHaveBeenCalledWith("request completed", {
        request: {
          headers: expect.objectContaining(requestHeaders),
          method: "GET",
          path: "/",
        },
        response: {
          headers: {
            "Content-Length": body.length,
            "Content-Type": "text/plain",
          },
          statusCode: 200,
        },
        responseTime: expect.any(Number),
      });
    });
  });

  describe("general error", () => {
    test("responds with status 500 and a generic error message for server errors", async () => {
      server.get("/", () => Promise.reject(new Error("Some internal error")));
      await server.start({ port });

      const response = await fetch(`http://localhost:${port}`, {
        method: "GET",
      });
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).toBe("Internal Server Error");
    });

    test("calls logger.error with appropriate message for server errors", async () => {
      const error = new Error("Some internal error");
      server.get("/", () => Promise.reject(error));
      await server.start({ port });
      const loggerErrorSpy = vi.spyOn(logger, "error");

      await fetch(`http://localhost:${port}`, {
        method: "GET",
      });

      expect(loggerErrorSpy).toHaveBeenCalledTimes(2);
      expect(loggerErrorSpy).toHaveBeenCalledWith("error", error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "request completed",
        expect.objectContaining({}),
      );
    });
  });

  describe("not found error", () => {
    test("responds with status 404 for undefined routes", async () => {
      await server.start({ port });

      const response = await fetch(`http://localhost:${port}/not-found`, {
        method: "GET",
      });
      const text = await response.text();

      expect(response.status).toBe(404);
      expect(text).toBe("Not Found");
    });

    test("calls logger.warn once for undefined routes", async () => {
      await server.start({ port });
      const loggerWarnSpy = vi.spyOn(logger, "warn");

      await fetch(`http://localhost:${port}/not-found`, {
        method: "GET",
      });

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        "request completed",
        expect.objectContaining({}),
      );
    });
  });
});
