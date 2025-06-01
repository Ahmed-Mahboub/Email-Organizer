import { useState } from "react";
import { Task } from "@/types";
import { format } from "date-fns";

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onBulkAction: (taskIds: string[], action: "done" | "archive") => void;
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function TaskList({
  tasks,
  onTaskClick,
  onBulkAction,
  page,
  pageSize,
  total,
  loading,
  onPageChange,
}: TaskListProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const totalPages = Math.ceil(total / pageSize);

  const handleSelectAll = (checked: boolean) => {
    setSelectedTasks(
      checked ? new Set(tasks.map((task) => task.id)) : new Set()
    );
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  return (
    <div className="bg-white shadow-md rounded-lg">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={selectedTasks.size === tasks.length && tasks.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-500">
            {selectedTasks.size} selected
          </span>
        </div>
        {selectedTasks.size > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={() => onBulkAction(Array.from(selectedTasks), "done")}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded"
            >
              Mark Done
            </button>
            <button
              onClick={() => onBulkAction(Array.from(selectedTasks), "archive")}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded"
            >
              Archive
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-4 py-2"></th>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">From</th>
                <th className="px-4 py-2 text-left">Labels</th>
                <th className="px-4 py-2 text-left">Confidence</th>
                <th className="px-4 py-2 text-left">Received</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectTask(task.id, e.target.checked);
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-2">{task.subject}</td>
                  <td className="px-4 py-2">{task.from}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {task.labels.map((label) => (
                        <span
                          key={label}
                          className="px-2 py-1 text-xs rounded-full bg-blue-100"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {Math.round(task.confidence * 100)}%
                  </td>
                  <td className="px-4 py-2">
                    {format(new Date(task.receivedAt), "MMM d, yyyy HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center p-4 border-t">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
