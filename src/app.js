// src/app.js
function greet(name) {
  if (!name) return "Hello, world!";
  return `Hello, ${name}!`;
}
module.exports = { greet };
