import express from "express";
import http from "http";
import path from "path";
import net from "net";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === "production";
  const server = http.createServer(app);

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoint for Cloud Run and container monitoring
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Direct Network / WiFi Thermal Printer Raw ESC/POS Socket Proxy
  // Sends raw binary stream directly to thermal printer IP:Port without opening any browser PDF/print preview
  app.post("/api/print/network-escpos", (req, res) => {
    const { ip, port = 9100, base64Data } = req.body;

    if (!ip || !base64Data) {
      return res.status(400).json({ success: false, error: "Missing printer IP address or base64 ESC/POS data" });
    }

    try {
      const buffer = Buffer.from(base64Data, "base64");
      const client = new net.Socket();
      const targetPort = Number(port) || 9100;

      client.setTimeout(4000);

      client.connect(targetPort, ip, () => {
        client.write(buffer, () => {
          client.end();
          return res.json({ success: true, message: `✓ ESC/POS binary data sent directly to Network Thermal Printer at ${ip}:${targetPort}` });
        });
      });

      client.on("error", (err) => {
        client.destroy();
        return res.status(500).json({ success: false, error: `Could not connect to printer socket at ${ip}:${targetPort}: ${err.message}` });
      });

      client.on("timeout", () => {
        client.destroy();
        return res.status(504).json({ success: false, error: `Connection to thermal printer at ${ip}:${targetPort} timed out.` });
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to process raw ESC/POS buffer" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
