export function greet(name) {
  if (!name) return "Hello, world!";
  return `Hello, ${name}!`;
}

// drive the page (for the demo)
const el = typeof document !== "undefined" ? document.getElementById("msg") : null;
if (el) el.textContent = greet("Jenkins");
