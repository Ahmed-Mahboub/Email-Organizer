import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupDatabase, AppDataSource, seedEmails } from "./database";
import { gmailWatcher } from "./services/gmailWatcher";
import { taskRoutes } from "./routes/tasks";
import { metricsRoutes } from "./routes/metrics";
import { authRoutes } from "./routes/auth";
import { classifyRoutes } from "./routes/classify";
import { logger } from "./utils/logger";

// Extend WebSocket type
interface WebSocketWithHeartbeat extends WebSocket {
  isAlive: boolean;
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/tasks", taskRoutes);
app.use("/metrics", metricsRoutes);
app.use("/auth", authRoutes);
app.use("/classify", classifyRoutes);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  // Add ping/pong for connection health
  clientTracking: true,
  perMessageDeflate: false,
});

// Export for use in other files
export const broadcastUpdate = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "taskUpdate",
          data,
        })
      );
    }
  });
};

// Heartbeat interval
const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;

wss.on("connection", (ws: WebSocketWithHeartbeat) => {
  logger.info("New WebSocket connection");

  // Set up heartbeat
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("error", (error) => {
    logger.error("WebSocket error:", error);
  });

  ws.on("close", () => {
    logger.info("WebSocket connection closed");
  });
});

// Heartbeat check
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const wsWithHeartbeat = ws as WebSocketWithHeartbeat;
    if (wsWithHeartbeat.isAlive === false) {
      logger.info("Terminating inactive WebSocket connection");
      return ws.terminate();
    }

    wsWithHeartbeat.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on("close", () => {
  clearInterval(interval);
});

// Initialize database and start server
async function startServer() {
  try {
    await setupDatabase();

    // Seed emails if Task table is empty
    const taskRepo = AppDataSource.getRepository("Task");
    const count = await taskRepo.count();

    if (process.env.NODE_ENV !== "production") {
      await seedEmails(AppDataSource, 80);
    }

    server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);

      // Start Gmail watcher if credentials are provided
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        gmailWatcher
          .setCredentials(process.env.GOOGLE_REFRESH_TOKEN)
          .then(() => gmailWatcher.start())
          .catch((error) =>
            logger.error("Failed to start Gmail watcher:", error)
          );
      } else {
        logger.info(
          "Gmail credentials not provided. Email watching is disabled."
        );
      }
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
