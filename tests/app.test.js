import { greet } from "../src/app.js";

test("default greeting", () => {
  expect(greet()).toBe("Hello, world!");
});

test("greets by name", () => {
  expect(greet("Induja")).toBe("Hello, Induja!");
});
