// Add global error handlers early so we capture crashes with stack traces
process.on("uncaughtException", (err) => {
  console.error("🚨 UNCAUGHT EXCEPTION - the process will exit:", err && err.stack ? err.stack : err);
  // Give logs a moment to flush then exit
  setTimeout(() => process.exit(1), 100);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 UNHANDLED REJECTION at:", promise, "reason:", reason && reason.stack ? reason.stack : reason);
});

import app from "./app.js";

const PORT = process.env.PORT || 5000;

try {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Optional: log when server 'error' event fires (e.g., EADDRINUSE)
  server.on("error", (err) => {
    console.error("🚨 Server error:", err && err.stack ? err.stack : err);
  });
} catch (err) {
  console.error("🚨 Failed to start server:", err && err.stack ? err.stack : err);
  process.exit(1);
}
