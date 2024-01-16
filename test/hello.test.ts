import { test, expect } from "vitest";
import { hello } from "../src/hello.js";

test("hello function outputs 'Hello world!'", () => {
  expect(hello()).toBe("Hello world!");
});
