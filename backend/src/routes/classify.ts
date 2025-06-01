import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  const { subject, from, body } = req.body;

  if (!subject || !from || !body) {
    return res
      .status(400)
      .json({ error: "Missing required fields: subject, from, or body" });
  }

  let labels: string[] = [];
  let taskType = "info";
  let confidence = 0.8;

  if (
    subject?.toLowerCase().includes("urgent") ||
    body?.toLowerCase().includes("urgent")
  ) {
    labels.push("urgent");
    taskType = "task";
    confidence = 0.95; // High confidence for urgent tasks
  }

  if (from?.toLowerCase().includes("boss")) {
    labels.push("work");
  }

  if (subject?.toLowerCase().includes("meeting")) {
    labels.push("meeting");
  }

  if (body?.toLowerCase().includes("project")) {
    labels.push("project");
  }

  if (body?.toLowerCase().includes("deadline")) {
    labels.push("deadline");
    confidence = Math.max(confidence, 0.9);
  }

  if (subject?.toLowerCase().includes("invoice")) {
    labels.push("invoice");
  }

  if (body?.toLowerCase().includes("contract")) {
    labels.push("contract");
  }

  if (from?.toLowerCase().includes("hr")) {
    labels.push("hr");
  }

  if (subject?.toLowerCase().includes("question")) {
    labels.push("question");
  }

  if (body?.toLowerCase().includes("feedback")) {
    labels.push("feedback");
  }

  if (labels.length === 0) {
    labels.push("general");
    taskType = "general";
  }

  if (labels.includes("urgent")) {
    confidence = Math.max(confidence, 0.95);
  }

  if (labels.includes("project") && labels.includes("deadline")) {
    confidence = Math.max(confidence, 0.9);
  }

  res.json({
    taskType,
    labels,
    confidence,
  });
});

export const classifyRoutes = router;
