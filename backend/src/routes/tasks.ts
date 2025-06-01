import { Router } from "express";
import { AppDataSource } from "../database";
import { Task } from "../entities/Task";
import { logger } from "../utils/logger";
import { In } from "typeorm";
import { broadcastUpdate } from "../index";

const router = Router();

// PATCH /tasks/bulk - update multiple tasks
router.patch("/bulk", async (req, res) => {
  try {
    const { ids, ...updateFields } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid task IDs for bulk update" });
    }
    const taskRepository = AppDataSource.getRepository(Task);
    const tasks = await taskRepository.findBy({ id: In(ids) });
    if (tasks.length !== ids.length) {
      return res.status(400).json({ error: "Some task IDs not found" });
    }
    for (const task of tasks) {
      Object.assign(task, updateFields);
    }
    await taskRepository.save(tasks);

    // Broadcast update
    broadcastUpdate({ type: "bulkUpdate", tasks });

    res.json({ success: true });
  } catch (error) {
    logger.error("Error updating tasks in bulk:", error);
    res.status(500).json({ error: "Failed to update tasks in bulk" });
  }
});

// PATCH /tasks/:id - update a single task
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const taskRepository = AppDataSource.getRepository(Task);
    const task = await taskRepository.findOneBy({ id });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    Object.assign(task, req.body);
    await taskRepository.save(task);

    // Broadcast update
    broadcastUpdate({ type: "taskUpdate", task });

    res.json(task);
  } catch (error) {
    logger.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Get latest 50 tasks with optional label filter
router.get("/", async (req, res) => {
  try {
    const { labels, startDate, endDate, search } = req.query;
    const taskRepository = AppDataSource.getRepository(Task);

    let query = taskRepository
      .createQueryBuilder("task")
      .orderBy("task.receivedAt", "DESC")
      .take(50);

    if (labels) {
      // Support both single and multiple labels
      const labelArray = Array.isArray(labels) ? labels : [labels];
      // Use LIKE for SQLite/simple-array, or array overlap for Postgres
      // This works for both: checks if labels string contains the label
      query = query.andWhere(
        labelArray.map((_, i) => `task.labels LIKE :label${i}`).join(" OR "),
        Object.fromEntries(labelArray.map((l, i) => ["label" + i, `%${l}%`]))
      );
    }

    if (startDate && endDate) {
      query = query.andWhere(
        "task.receivedAt BETWEEN :startDate AND :endDate",
        {
          startDate: new Date(startDate as string).toISOString(),
          endDate: new Date(endDate as string).toISOString(),
        }
      );
    }

    // if (search) {
    //   query = query.andWhere(
    //     "(task.subject LIKE :search OR task.body LIKE :search)",
    //     { search: `%${search}%` }
    //   );
    // }

    const tasks = await query.getMany();
    res.json(tasks);
  } catch (error) {
    logger.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as taskRoutes };
