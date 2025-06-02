import dotenv from "dotenv";
dotenv.config();

jest.mock("../index", () => ({
  broadcastUpdate: jest.fn(),
}));

jest.mock("axios", () => ({
  post: jest.fn().mockResolvedValue({
    data: {
      labels: ["general"],
      confidence: 0.7,
    },
  }),
}));

import { DataSource } from "typeorm";
import { Task } from "../entities/Task";
import express from "express";
import request from "supertest";
import { seedEmails } from "../database/seeds/emailSeeder";

let testDataSource: DataSource;
let app: express.Application;

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

    // Seed some test data
    await seedEmails(testDataSource, 10);

    // Dynamically mock the database after data source is ready
    jest.doMock("../database", () => ({
      AppDataSource: {
        getRepository: (entity: any) => testDataSource.getRepository(entity),
        initialize: async () => {},
        destroy: async () => {},
      },
    }));

    // Now import after mocking
    const { taskRoutes } = await import("../routes/tasks");
    const { GmailWatcher } = await import("../services/gmailWatcher");

    const gmailWatcher = new GmailWatcher(testDataSource.getRepository(Task));

    app = express();
    app.use(express.json());
    app.use("/tasks", taskRoutes);

    // Attach to global scope if needed in tests
    (global as any).gmailWatcher = gmailWatcher;
  });

  afterAll(async () => {
    await testDataSource.destroy();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(Task).clear();
  });

  it("should process email and create task", async () => {
    const gmailWatcher = (global as any).gmailWatcher;

    const mockEmail = {
      subject: "Test Email",
      from: "test@example.com",
      body: "Test body",
      messageId: "123",
    };

    await gmailWatcher.processEmail(mockEmail);
    // Wait longer for processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify task was created
    const task = await testDataSource
      .getRepository(Task)
      .findOneBy({ messageId: "123" });

    expect(task).toBeDefined();
    expect(task?.subject).toBe("Test Email");

    const res = await request(app).get("/tasks");
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(1);
  });
});
