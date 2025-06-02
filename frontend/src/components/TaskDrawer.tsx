import { Drawer, Space, Tag, Select, message } from "antd";
import { Task } from "@/types";
import dayjs from "dayjs";
import DOMPurify from "dompurify";

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
  if (!task) return null;

  const handleLabelUpdate = async (newLabels: string[]) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            labels: newLabels,
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
        <h2>{task.subject}</h2>
        <p>From: {task.from}</p>
        <p>Received: {dayjs(task.receivedAt).format("YYYY-MM-DD HH:mm")}</p>
        <div>
          <h3>Labels:</h3>
          <Space wrap>
            {task.labels.map((label) => (
              <Tag key={label} color="blue">
                {label}
              </Tag>
            ))}
          </Space>
          <div className="mt-2">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Select
                mode="multiple"
                placeholder="Re-label"
                style={{ width: "100%" }}
                value={task.labels}
                onChange={handleLabelUpdate}
              >
                {Array.from(new Set(allTasks.flatMap((t) => t.labels))).map(
                  (label) => (
                    <Select.Option key={label} value={label}>
                      {label}
                    </Select.Option>
                  )
                )}
              </Select>
            </Space>
          </div>
        </div>
        <div className="mt-4">
          <h3>Content:</h3>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(task.body),
            }}
          />
        </div>
        <div className="mt-4">
          <h3>Classification:</h3>
          <pre className="bg-gray-100 p-4 rounded">
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
