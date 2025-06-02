import express from "express";
import { AppDataSource } from "../database";
import { Task } from "../entities/Task";
import { logger } from "../utils/logger";
import { In } from "typeorm";
import { broadcastUpdate } from "../index";

const router = express.Router();

router.patch("/bulk", async (req, res) => {
  try {
    const { ids, isDone, isArchived } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid task IDs" });
    }
    const taskRepository = AppDataSource.getRepository(Task);
    await taskRepository.update(ids, { isDone, isArchived });

    const tasks = await taskRepository.findBy({ id: In(ids) });
    broadcastUpdate({ type: "bulkUpdate", tasks });

    res.json({ success: true });
  } catch (error) {
    logger.error("Error bulk updating tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { labels, isDone, isArchived } = req.body;

    const taskRepository = AppDataSource.getRepository(Task);
    const task = await taskRepository.findOneBy({ id });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (labels) task.labels = labels;
    if (typeof isDone === "boolean") task.isDone = isDone;
    if (typeof isArchived === "boolean") task.isArchived = isArchived;

    await taskRepository.save(task);

    broadcastUpdate({ type: "taskUpdate", task });

    res.json(task);
  } catch (error) {
    logger.error("Error updating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const {
      labels,
      startDate,
      endDate,
      search,
      page = 1,
      pageSize = 50,
    } = req.query;
    const taskRepository = AppDataSource.getRepository(Task);

    let query = taskRepository
      .createQueryBuilder("task")
      .orderBy("task.receivedAt", "DESC");

    if (labels) {
      const labelArray = Array.isArray(labels) ? labels : [labels];
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

    // Get total count before pagination
    const total = await query.getCount();

    // Add pagination
    const skip = (Number(page) - 1) * Number(pageSize);
    query = query.skip(skip).take(Number(pageSize));

    const tasks = await query.getMany();

    res.json({
      tasks,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
    });
  } catch (error) {
    logger.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const taskRoutes = router;
