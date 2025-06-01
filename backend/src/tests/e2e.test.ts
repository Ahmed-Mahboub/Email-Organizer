import dotenv from "dotenv";
dotenv.config();

jest.mock("../database", () => {
  const { DataSource } = require("typeorm");
  const { Task } = require("../entities/Task");

  const testDataSource = new DataSource({
    type: process.env.DATABASE_TYPE,
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    dropSchema: false,
    synchronize: false,
    logging: false,
    entities: [Task],
  });

  return {
    AppDataSource: testDataSource,
  };
});

import { DataSource } from "typeorm";
import { Task } from "../entities/Task";
import { GmailWatcher } from "../services/gmailWatcher";

let testDataSource: DataSource;
let gmailWatcher: GmailWatcher;

describe("E2E Tests", () => {
  beforeAll(async () => {
    testDataSource = new DataSource({
      type: "sqlite",
      database: ":memory:",
      dropSchema: true,
      synchronize: true,
      logging: false,
      entities: [Task],
    });
    await testDataSource.initialize();
    gmailWatcher = new GmailWatcher(testDataSource.getRepository(Task));
  });

  afterAll(async () => {
    await testDataSource.destroy();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(Task).clear();
  });

  it("should process email and create task", async () => {
    // Mock email data
    const mockEmail = {
      subject: "Test Email",
      from: "test@example.com",
      body: "Test body",
      messageId: "123",
    };

    // Process email using the test gmailWatcher
    await gmailWatcher.processEmail(mockEmail);

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify task was created
    const taskRepository = testDataSource.getRepository(Task);
    const task = await taskRepository.findOneBy({ messageId: "123" });

    expect(task).toBeDefined();
    expect(task?.subject).toBe("Test Email");
    expect(task?.labels).toContain("general");
    expect(task?.confidence).toBeLessThanOrEqual(0.8);
  });
});
