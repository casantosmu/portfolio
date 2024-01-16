import { pino } from "pino";
import { Server } from "./server.js";

const PORT = process.env["SERVER_PORT"] ?? 3000;
const LOG_LEVEL = process.env["LOG_LEVEL"] ?? "info";

const logger = pino({
  level: LOG_LEVEL,
  messageKey: "message",
  errorKey: "error",
  nestedKey: "metadata",
  hooks: {
    logMethod(inputArguments: [msg: string, ...args: unknown[]], method) {
      if (inputArguments.length >= 2) {
        const argument1 = inputArguments.shift();
        const argument2 = inputArguments.shift();
        Reflect.apply(method, this, [argument2, argument1, ...inputArguments]);
        return;
      }
      method.apply(this, inputArguments);
    },
  },
});

const server = new Server({ logger });

server.get("/", () => {
  return Promise.resolve("hello world");
});

server.get("/error", () => {
  return Promise.reject(new Error("Interal unkwnon error"));
});

await server.start({ port: Number(PORT) });
