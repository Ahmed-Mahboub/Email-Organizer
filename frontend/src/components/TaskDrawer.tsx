import { Drawer, Space, Tag, Select, message, Divider, Button } from "antd";
import { Task } from "@/types";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import { useState, useEffect } from "react";

interface TaskDrawerProps {
  task: Task | null;
  allTasks: Task[];
  onClose: () => void;
  onTaskUpdate: (updatedTask: Task) => void;
}

export function TaskDrawer({
  task,
  allTasks,
  onClose,
  onTaskUpdate,
}: TaskDrawerProps) {
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setSelectedLabels(task.labels);
    }
  }, [task]);

  if (!task) return null;

  const handleLabelUpdate = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            labels: selectedLabels,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to update labels");
      const updatedTask = await response.json();
      onTaskUpdate(updatedTask);
      message.success("Labels updated successfully");
    } catch (error) {
      message.error("Failed to update labels");
      console.error("Failed to update labels:", error);
    }
  };

  return (
    <Drawer
      title="Task Details"
      placement="right"
      onClose={onClose}
      open={!!task}
      width={600}
    >
      <div>
        <h2 className="text-xl font-bold mb-2">{task.subject}</h2>
        <p className="mb-1">
          {" "}
          <strong>From : </strong> {task.from}
        </p>
        <p className="mb-2">
          <strong>Received : </strong>{" "}
          {dayjs(task.receivedAt).format("YYYY-MM-DD HH:mm")}
        </p>

        <Divider className="my-3 border-gray-300" />

        <div>
          <h3 className="text-lg font-bold mb-1">Labels:</h3>
          <Space wrap>
            {task.labels.map((label) => (
              <Tag key={label} color="blue">
                {label}
              </Tag>
            ))}
          </Space>
          <div className="mt-2">
            <div className="flex gap-2 ">
              <Select
                mode="multiple"
                placeholder="Re-label"
                style={{ width: "80%" }}
                value={selectedLabels}
                onChange={setSelectedLabels}
              >
                {Array.from(new Set(allTasks.flatMap((t) => t.labels))).map(
                  (label) => (
                    <Select.Option key={label} value={label}>
                      {label}
                    </Select.Option>
                  )
                )}
              </Select>
              <Button type="primary" onClick={handleLabelUpdate}>
                Apply Labels
              </Button>
            </div>
          </div>
        </div>

        <Divider className="my-3 border-gray-300" />

        <div>
          <h3 className="text-lg font-bold mb-1">Content:</h3>
          <div
            className="bg-gray-100 p-3 rounded"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(task.body),
            }}
          />
        </div>

        <Divider className="my-3 border-gray-300" />

        <div>
          <h3 className="text-lg font-bold mb-1">Classification:</h3>
          <pre className="bg-gray-100 p-3 rounded">
            {JSON.stringify(
              {
                taskType: task.taskType,
                labels: task.labels,
                confidence: task.confidence,
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </Drawer>
  );
}
