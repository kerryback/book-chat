import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security headers for iframe compatibility
app.use((_req, res, next) => {
  // Don't set X-Frame-Options at all - rely on CSP instead
  // (X-Frame-Options is deprecated in favor of CSP frame-ancestors)

  // Set permissive CSP that allows iframe embedding from any origin
  res.setHeader('Content-Security-Policy', "frame-ancestors *");

  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    } else if (path.startsWith("/assets/")) {
      // Log asset requests for debugging
      log(`ASSET: ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    } else if (path === "/" || path.endsWith(".html")) {
      // Log HTML requests for debugging
      log(`HTML: ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  log("Starting server initialization...");
  log(`Node environment: ${process.env.NODE_ENV}`);
  log(`Port: ${process.env.PORT || 5000}`);
  
  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
    log("Created uploads directory");
  }
  
  try {
    const server = await registerRoutes(app);
    log("Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    log("Setting up static file serving for production...");
    serveStatic(app);
    log("Static file serving configured");
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
  server.listen(Number(port), "0.0.0.0", () => {
    log(`Server is running on port ${port}`);
    log(`Health check available at http://0.0.0.0:${port}/health`);
  });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
