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

import request from "supertest";
import express from "express";
import { AppDataSource } from "../database";
import { Task } from "../entities/Task";
import { taskRoutes } from "../routes/tasks";

describe("/tasks routes", () => {
  let app: express.Express;

  beforeAll(async () => {
    await AppDataSource.initialize();
    app = express();
    app.use(express.json());
    app.use("/tasks", taskRoutes);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    await AppDataSource.getRepository(Task).clear();
  });

  it("GET /tasks - should return latest 50 tasks", async () => {
    const repo = AppDataSource.getRepository(Task);
    for (let i = 0; i < 60; i++) {
      await repo.save(
        repo.create({
          subject: `Task ${i}`,
          from: "user@example.com",
          labels: ["general"],
          confidence: 0.9,
          messageId: `msg-${i}`,
          receivedAt: new Date(),
        })
      );
    }

    const res = await request(app).get("/tasks");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(50);
    expect(res.body[0].subject).toBe("Task 59");
  });

  it("GET /tasks - with label filter", async () => {
    const repo = AppDataSource.getRepository(Task);
    await repo.save([
      repo.create({
        subject: "Work",
        from: "a@example.com",
        labels: ["work", "important"],
        confidence: 0.95,
        messageId: "m1",
        receivedAt: new Date(),
      }),
      repo.create({
        subject: "Personal",
        from: "b@example.com",
        labels: ["personal"],
        confidence: 0.85,
        messageId: "m2",
        receivedAt: new Date(),
      }),
    ]);

    // Send a GET request with labels as a comma-separated list
    const res = await request(app).get("/tasks?labels=work,important");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1); // Only the "Work" task should be returned
    expect(res.body[0].labels).toContain("work");
    expect(res.body[0].labels).toContain("important");
  });

  it("GET /tasks - with date range", async () => {
    const repo = AppDataSource.getRepository(Task);
    const now = new Date();
    const oldDate = new Date("2020-01-01");

    await repo.save([
      repo.create({
        subject: "Old",
        from: "x@example.com",
        labels: ["old"],
        confidence: 0.5,
        messageId: "old",
        receivedAt: oldDate,
      }),
      repo.create({
        subject: "New",
        from: "y@example.com",
        labels: ["new"],
        confidence: 0.9,
        messageId: "new",
        receivedAt: "2020-04-04",
      }),
    ]);

    const res = await request(app).get(
      `/tasks?startDate=2019-01-01&endDate=${now.toISOString()}`
    );

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2); // Check if both tasks are returned
  });

  // it("GET /tasks - with search", async () => {
  //   const repo = AppDataSource.getRepository(Task);
  //   await repo.save([
  //     repo.create({
  //       subject: "Important update",
  //       body: "Please review",
  //       from: "boss@example.com",
  //       labels: ["priority"],
  //       confidence: 0.99,
  //       messageId: "s1",
  //       receivedAt: new Date(),
  //     }),
  //     repo.create({
  //       subject: "Other",
  //       body: "Nothing to see here",
  //       from: "bot@example.com",
  //       labels: ["misc"],
  //       confidence: 0.4,
  //       messageId: "s2",
  //       receivedAt: new Date(),
  //     }),
  //   ]);

  //   const res = await request(app).get("/tasks?search=important");

  //   expect(res.status).toBe(200);
  //   expect(res.body.length).toBe(1); // Only the "Important update" task should be returned
  //   expect(res.body[0].subject).toMatch(/important/i); // Case-insensitive search for "important"
  // });

  it("PATCH /tasks/:id - should update task", async () => {
    const repo = AppDataSource.getRepository(Task);
    const task = await repo.save(
      repo.create({
        subject: "Update me",
        from: "update@example.com",
        labels: ["init"],
        confidence: 0.5,
        messageId: "u1",
        receivedAt: new Date(),
        isDone: false,
      })
    );

    const res = await request(app)
      .patch(`/tasks/${task.id}`)
      .send({ labels: ["updated"], isDone: true });

    expect(res.status).toBe(200);
    expect(res.body.labels).toContain("updated");
    expect(res.body.isDone).toBe(true);
  });

  it("PATCH /tasks/:id - should return 404 if task not found", async () => {
    const res = await request(app)
      .patch(`/tasks/00000000-0000-0000-0000-000000000000`)
      .send({
        labels: ["notfound"],
      });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("PATCH /tasks/bulk - should update multiple tasks", async () => {
    const repo = AppDataSource.getRepository(Task);
    const tasks = await repo.save([
      repo.create({
        subject: "Bulk 1",
        from: "a@bulk.com",
        labels: [],
        confidence: 0.4,
        messageId: "b1",
        receivedAt: new Date(),
        isDone: false,
      }),
      repo.create({
        subject: "Bulk 2",
        from: "b@bulk.com",
        labels: [],
        confidence: 0.6,
        messageId: "b2",
        receivedAt: new Date(),
        isDone: false,
      }),
    ]);

    const res = await request(app)
      .patch("/tasks/bulk")
      .send({
        ids: tasks.map((t) => t.id),
        isDone: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await repo.findBy({ id: tasks[0].id });
    expect(updated[0].isDone).toBe(true);
  });

  it("PATCH /tasks/bulk - should fail on invalid IDs", async () => {
    const res = await request(app).patch("/tasks/bulk").send({
      ids: [],
      isArchived: true,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid task/i);
  });
});
