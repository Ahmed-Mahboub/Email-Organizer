import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { logger } from "../utils/logger";
import { AppDataSource } from "../database";
import { Task } from "../entities/Task";
import axios from "axios";
import { broadcastUpdate } from "../index";

interface EmailData {
  subject: string;
  from: string;
  body: string;
  messageId: string;
}

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(maxTokens: number = 50, refillRate: number = 60000) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }

  async waitForToken(): Promise<void> {
    this.refillTokens();
    let backoff = 1000;
    while (this.tokens <= 0) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
      this.refillTokens();
      backoff = Math.min(backoff * 2, 30000);
    }
    this.tokens--;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const refillAmount =
      Math.floor(timePassed / this.refillRate) * this.maxTokens;
    if (refillAmount > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount);
      this.lastRefill = now;
    }
  }
}

const classifyRateLimiter = new RateLimiter(50, 60000);

class GmailWatcher {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private watchInterval: NodeJS.Timeout | null = null;
  private historyId: string | null = null;
  private isWatching: boolean = false;
  private batchSize: number = 8;
  private processingQueue: EmailData[] = [];
  private isProcessing: boolean = false;
  private taskRepository;

  constructor(taskRepository = AppDataSource.getRepository(Task)) {
    this.taskRepository = taskRepository;
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
  }

  public async setCredentials(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
  }

  private async watchInbox() {
    try {
      const response = await this.gmail.users.watch({
        userId: "me",
        requestBody: {
          labelIds: ["INBOX"],
          topicName: `projects/${process.env.GOOGLE_PROJECT_ID}/topics/${process.env.GOOGLE_TOPIC_NAME}`,
        },
      });

      this.historyId = response.data.historyId;
      logger.info("Started watching Gmail inbox");
    } catch (error) {
      logger.error("Error watching Gmail inbox:", error);
      throw error;
    }
  }

  private async processNewEmails() {
    if (!this.historyId) return;

    try {
      const response = await this.gmail.users.history.list({
        userId: "me",
        startHistoryId: this.historyId,
      });

      const history = response.data.history || [];
      for (const record of history) {
        if (record.messagesAdded) {
          for (const message of record.messagesAdded) {
            const email = await this.fetchEmail(message.message.id);
            if (email) {
              this.processingQueue.push(email);
            }
          }
        }
      }

      if (history.length > 0) {
        this.historyId = history[history.length - 1].id;
      }

      await this.processQueue();
    } catch (error) {
      logger.error("Error processing new emails:", error);
    }
  }

  private async fetchEmail(messageId: string): Promise<EmailData | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const message = response.data;
      const headers = message.payload.headers;

      const subject =
        headers.find((h: any) => h.name === "Subject")?.value || "";
      const from = headers.find((h: any) => h.name === "From")?.value || "";

      let body = "";
      if (message.payload.parts) {
        const textPart = message.payload.parts.find(
          (part: any) => part.mimeType === "text/plain"
        );
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, "base64").toString();
        }
      } else if (message.payload.body.data) {
        body = Buffer.from(message.payload.body.data, "base64").toString();
      }

      return {
        subject,
        from,
        body,
        messageId,
      };
    } catch (error) {
      logger.error("Error fetching email:", error);
      return null;
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.processingQueue.splice(0, this.batchSize);

    try {
      const tasks = await Promise.all(
        batch.map(async (email) => {
          await classifyRateLimiter.waitForToken();
          const response = await axios.post(
            "http://localhost:3001/classify",
            {
              subject: email.subject,
              from: email.from,
              body: email.body,
            },
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          const classification = response.data;
          const task = new Task();
          task.subject = email.subject;
          task.from = email.from;
          task.body = email.body;
          task.messageId = email.messageId;
          task.labels = classification.labels;
          task.confidence = classification.confidence;
          task.receivedAt = new Date();
          return task;
        })
      );

      await this.taskRepository.save(tasks);
      logger.info(`Processed and saved ${tasks.length} emails`);

      // Broadcast new tasks to all connected clients
      broadcastUpdate({
        type: "newTasks",
        tasks,
      });
    } catch (error) {
      logger.error("Error processing email batch:", error);
      this.processingQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
      if (this.processingQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  public async start() {
    if (this.isWatching) return;

    try {
      await this.watchInbox();
      this.isWatching = true;

      // Poll for new emails every minute
      this.watchInterval = setInterval(() => {
        this.processNewEmails();
      }, 60000);
    } catch (error) {
      logger.error("Error starting Gmail watcher:", error);
      throw error;
    }
  }

  public stop() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    this.isWatching = false;
    logger.info("Stopped watching Gmail inbox");
  }

  public async processEmail(email: EmailData) {
    this.processingQueue.push(email);
    await this.processQueue();
  }
}

export const gmailWatcher = new GmailWatcher();
export { GmailWatcher };
