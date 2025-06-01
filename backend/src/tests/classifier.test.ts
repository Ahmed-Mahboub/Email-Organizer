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
import { classifyRoutes } from "../routes/classify";

describe("/classify Endpoint", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/classify", classifyRoutes);
  });

  it("should classify urgent emails as task", async () => {
    const res = await request(app).post("/classify").send({
      subject: "Urgent: Project deadline",
      from: "boss@example.com",
      body: "This is urgent, please respond.",
    });
    expect(res.status).toBe(200);
    expect(res.body.taskType).toBe("task");
    expect(res.body.labels).toContain("urgent");
    expect(res.body.labels).toContain("work");
    expect(res.body.confidence).toBeGreaterThan(0.9);
  });

  it("should classify non-urgent emails as info/general", async () => {
    const res = await request(app).post("/classify").send({
      subject: "Hello",
      from: "friend@example.com",
      body: "Just saying hi.",
    });
    expect(res.status).toBe(200);
    expect(["info", "general"]).toContain(res.body.taskType);
    expect(res.body.labels).toContain("general");
    expect(res.body.confidence).toBeLessThanOrEqual(0.8);
  });
});
