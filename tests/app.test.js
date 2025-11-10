// tests/app.test.js
const { greet } = require("../src/app");

test("default greeting", () => {
  expect(greet()).toBe("Hello, world!");
});

test("greets by name", () => {
  expect(greet("Induja")).toBe("Hello, Induja!");
});
