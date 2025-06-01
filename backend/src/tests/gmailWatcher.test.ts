import { DataSource } from "typeorm";
import { Task } from "../entities/Task";
import { GmailWatcher } from "../services/gmailWatcher";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GmailWatcher Rate Limiting", () => {
  let dataSource: DataSource;
  let gmailWatcher: GmailWatcher;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: "sqlite",
      database: ":memory:",
      entities: [Task],
      synchronize: true,
    });
    await dataSource.initialize();
    gmailWatcher = new GmailWatcher(dataSource.getRepository(Task));
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("should respect the 50 req/min rate limit with exponential backoff", async () => {
    // Arrange: mock classify endpoint to always succeed
    mockedAxios.post.mockResolvedValue({
      data: { labels: ["general"], confidence: 0.8 },
    });

    // Prepare 60 emails to trigger rate limiting (limit is 50/min)
    const emails = Array.from({ length: 60 }, (_, i) => ({
      subject: `Test Email ${i}`,
      from: `test${i}@example.com`,
      body: `Body ${i}`,
      messageId: `msg-${i}`,
    }));

    // Add all emails to the processing queue
    // @ts-ignore (accessing private for test)
    gmailWatcher.processingQueue.push(...emails);

    const start = Date.now();
    // @ts-ignore (accessing private for test)
    await gmailWatcher.processQueue();
    const duration = Date.now() - start;

    // 60 requests, 50 allowed per minute, so at least 10 must wait for the next minute
    // So duration should be at least ~60 seconds (allowing for some timing slack)
    expect(duration).toBeGreaterThanOrEqual(59000);
    // All emails should be processed and saved
    const tasks = await dataSource.getRepository(Task).find();
    expect(tasks.length).toBe(60);
  });

  it("should back off and retry on rate limit error from classify endpoint", async () => {
    // Arrange: first 3 requests fail with 429, then succeed
    let callCount = 0;
    mockedAxios.post.mockImplementation(() => {
      callCount++;
      if (callCount <= 3) {
        const error: any = new Error("Rate limit");
        error.response = { status: 429 };
        return Promise.reject(error);
      }
      return Promise.resolve({
        data: { labels: ["general"], confidence: 0.8 },
      });
    });

    // Prepare 1 email
    const email = {
      subject: "Rate Limit Test",
      from: "test@example.com",
      body: "Body",
      messageId: "msg-rate-limit",
    };
    // @ts-ignore (accessing private for test)
    gmailWatcher.processingQueue.push(email);

    // Act
    // @ts-ignore (accessing private for test)
    await gmailWatcher.processQueue();

    // Assert: should have retried and eventually succeeded
    const task = await dataSource
      .getRepository(Task)
      .findOneBy({ messageId: "msg-rate-limit" });
    expect(task).toBeDefined();
    expect(callCount).toBeGreaterThan(1);
  });
});
