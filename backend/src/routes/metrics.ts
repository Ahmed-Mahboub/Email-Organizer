import { Router } from "express";
import { register, Gauge } from "prom-client";
import { logger } from "../utils/logger";
import { AppDataSource } from "../database";
import { Task } from "../entities/Task";

const router = Router();

const taskCount = new Gauge({
  name: "task_count",
  help: "Total number of tasks in the system",
  labelNames: ["status"],
});

const doneTaskCount = new Gauge({
  name: "done_task_count",
  help: "Number of tasks marked as done",
});

const archivedTaskCount = new Gauge({
  name: "archived_task_count",
  help: "Number of tasks marked as archived",
});

const labelTaskCount = new Gauge({
  name: "label_task_count",
  help: "Number of tasks by label",
  labelNames: ["label"],
});

router.get("/", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Task);
    const total = await repo.count();
    const done = await repo.count({ where: { isDone: true } });
    const archived = await repo.count({ where: { isArchived: true } });
    taskCount.set({ status: "all" }, total);
    doneTaskCount.set(done);
    archivedTaskCount.set(archived);

    // Count by label (for all labels in the DB)
    const allTasks = await repo.find();
    const labelMap: Record<string, number> = {};
    allTasks.forEach((task) => {
      (task.labels || []).forEach((label) => {
        labelMap[label] = (labelMap[label] || 0) + 1;
      });
    });
    Object.entries(labelMap).forEach(([label, count]) => {
      labelTaskCount.set({ label }, count);
    });

    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error("Error generating metrics:", error);
    res.status(500).send("Error generating metrics");
  }
});

export const metricsRoutes = router;
export const metrics = {
  taskCount,
  doneTaskCount,
  archivedTaskCount,
  labelTaskCount,
};
