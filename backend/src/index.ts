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

interface WebSocketWithHeartbeat extends WebSocket {
  isAlive: boolean;
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/tasks", taskRoutes);
app.use("/metrics", metricsRoutes);
app.use("/auth", authRoutes);
app.use("/classify", classifyRoutes);

const server = createServer(app);

const wss = new WebSocketServer({
  server,

  clientTracking: true,
  perMessageDeflate: false,
});

export const broadcastUpdate = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const message = {
        type: data.type || "taskUpdate",
        data: {
          task: data.task,
          tasks: data.tasks,
        },
      };
      client.send(JSON.stringify(message));
    }
  });
};

const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;

wss.on("connection", (ws: WebSocketWithHeartbeat) => {
  logger.info("New WebSocket connection");

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

async function startServer() {
  try {
    await setupDatabase();

    const taskRepo = AppDataSource.getRepository("Task");
    const count = await taskRepo.count();

    if (process.env.NODE_ENV !== "production") {
      await seedEmails(AppDataSource, 10);
    }

    server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);

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
