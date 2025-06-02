import { useState } from "react";
import { Task } from "@/types";
import { format } from "date-fns";
import DOMPurify from "dompurify";

interface TaskDrawerProps {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

export function TaskDrawer({ task, onClose, onUpdate }: TaskDrawerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(task.labels);

  const handleUpdateLabels = async () => {
    try {
      setIsUpdating(true);
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

      if (response.ok) {
        const updatedTask = await response.json();
        onUpdate(updatedTask);
      }
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end">
      <div className="w-full max-w-md bg-white h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h3 className="font-medium mb-2">Subject</h3>
            <p>{task.subject}</p>
          </div>

          <div>
            <h3 className="font-medium mb-2">From</h3>
            <p>{task.from}</p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Received</h3>
            <p>{format(new Date(task.receivedAt), "PPpp")}</p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Labels</h3>
            <div className="flex flex-wrap gap-2">
              {selectedLabels.map((label) => (
                <span
                  key={label}
                  className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm"
                >
                  {label}
                  <button
                    onClick={() =>
                      setSelectedLabels((labels) =>
                        labels.filter((l) => l !== label)
                      )
                    }
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={handleUpdateLabels}
              disabled={isUpdating}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Update Labels"}
            </button>
          </div>

          <div>
            <h3 className="font-medium mb-2">Email Body</h3>
            <div className="bg-gray-50 p-4 rounded overflow-auto">
              <div
                className="prose max-w-none p-4 bg-gray-50 rounded"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(task.body),
                }}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Classification</h3>
            <pre className="bg-gray-50 p-4 rounded overflow-auto">
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
      </div>
    </div>
  );
}
