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

import { AppDataSource } from "../database";
import { Task } from "../entities/Task";

describe("Database Tests", () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clear the database before each test
    const taskRepository = AppDataSource.getRepository(Task);
    await taskRepository.clear();
  });

  it("should create a new task", async () => {
    const taskRepository = AppDataSource.getRepository(Task);

    const task = new Task();
    task.subject = "Test Task";
    task.from = "test@example.com";
    task.body = "Test body";
    task.labels = ["test", "important"];
    task.confidence = 0.95;
    task.messageId = "123";
    task.receivedAt = new Date();

    const savedTask = await taskRepository.save(task);

    expect(savedTask.id).toBeDefined();
    expect(savedTask.subject).toBe("Test Task");
    expect(savedTask.labels).toContain("test");
    expect(savedTask.labels).toContain("important");
  });

  it("should find tasks by labels", async () => {
    const taskRepository = AppDataSource.getRepository(Task);

    // Create test tasks
    const task1 = new Task();
    task1.subject = "Task 1";
    task1.from = "test1@example.com";
    task1.labels = ["urgent", "work"];
    task1.confidence = 0.9;
    task1.messageId = "123";
    task1.receivedAt = new Date();

    const task2 = new Task();
    task2.subject = "Task 2";
    task2.from = "test2@example.com";
    task2.labels = ["personal", "urgent"];
    task2.confidence = 0.8;
    task2.messageId = "456";
    task2.receivedAt = new Date();

    await taskRepository.save([task1, task2]);

    // Find tasks with 'urgent' label
    const urgentTasks = await taskRepository
      .createQueryBuilder("task")
      .where("task.labels LIKE :label", { label: "%urgent%" })
      .getMany();

    expect(urgentTasks).toHaveLength(2);
    expect(urgentTasks[0].labels).toContain("urgent");
    expect(urgentTasks[1].labels).toContain("urgent");
  });

  it("should update task status", async () => {
    const taskRepository = AppDataSource.getRepository(Task);

    const task = new Task();
    task.subject = "Test Task";
    task.from = "test@example.com";
    task.labels = ["test"];
    task.confidence = 0.95;
    task.messageId = "123";
    task.receivedAt = new Date();

    const savedTask = await taskRepository.save(task);

    // Update task status
    savedTask.isDone = true;
    savedTask.isArchived = true;
    await taskRepository.save(savedTask);

    // Verify update
    const updatedTask = await taskRepository.findOneBy({ id: savedTask.id });
    expect(updatedTask?.isDone).toBe(true);
    expect(updatedTask?.isArchived).toBe(true);
  });

  it("should enforce unique messageId constraint", async () => {
    const taskRepository = AppDataSource.getRepository(Task);

    const task1 = new Task();
    task1.subject = "Task 1";
    task1.from = "test@example.com";
    task1.labels = ["test"];
    task1.confidence = 0.95;
    task1.messageId = "123";
    task1.receivedAt = new Date();

    await taskRepository.save(task1);

    // Try to create another task with the same messageId
    const task2 = new Task();
    task2.subject = "Task 2";
    task2.from = "test@example.com";
    task2.labels = ["test"];
    task2.confidence = 0.95;
    task2.messageId = "123"; // Same messageId
    task2.receivedAt = new Date();

    await expect(taskRepository.save(task2)).rejects.toThrow();
  });
});
