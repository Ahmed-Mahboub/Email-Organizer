"use client";

import { useState, useEffect } from "react";
import { Card, Space, Button, message } from "antd";
import { CheckOutlined, DeleteOutlined } from "@ant-design/icons";
import { Task } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TaskTable } from "@/components/TaskTable";
import { TaskDrawer } from "@/components/TaskDrawer";
import { FilterBar } from "@/components/FilterBar";

const PAGE_SIZE = 50;

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    labels: [] as string[],
    startDate: "",
    endDate: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const searchParams = new URLSearchParams();
      if (filters.labels.length > 0) {
        filters.labels.forEach((label) => searchParams.append("labels", label));
      }
      if (filters.startDate)
        searchParams.append("startDate", filters.startDate);
      if (filters.endDate) searchParams.append("endDate", filters.endDate);
      searchParams.append("page", String(page));
      searchParams.append("pageSize", String(PAGE_SIZE));

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tasks?${searchParams}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTasks(data.tasks);
        setFilteredTasks(data.tasks);
        setTotal(data.total);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        message.error("Failed to fetch tasks");
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [filters.labels, filters.startDate, filters.endDate, page]);

  useEffect(() => {
    if (!filters.search) {
      setFilteredTasks(tasks);
      return;
    }

    const searchLower = filters.search.toLowerCase();
    const filtered = tasks.filter(
      (task) =>
        task.subject.toLowerCase().includes(searchLower) ||
        task.body.toLowerCase().includes(searchLower)
    );
    setFilteredTasks(filtered);
  }, [filters.search, tasks]);

  useWebSocket((message) => {
    if (!message || !message.type || !message.data) return;

    if (message.type === "taskUpdate" && message.data.task) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === message.data.task!.id ? message.data.task! : task
        )
      );
    } else if (message.type === "bulkUpdate" && message.data.tasks) {
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          const updatedTask = message.data.tasks!.find((t) => t.id === task.id);
          return updatedTask || task;
        })
      );
    } else if (message.type === "newTasks" && message.data.tasks) {
      setTasks((prevTasks) => {
        const existingIds = new Set(prevTasks.map((t) => t.id));
        const newTasks = message.data.tasks!.filter(
          (t) => !existingIds.has(t.id)
        );
        return [...newTasks, ...prevTasks];
      });
      setTotal((prev) => prev + message.data.tasks!.length);
    }
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseDrawer = () => {
    setSelectedTask(null);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleBulkAction = async (
    taskIds: string[],
    action: "done" | "archive"
  ) => {
    const prevTasks = [...tasks];
    const prevSelectedKeys = [...selectedRowKeys];
    const actionText = action === "done" ? "marked as done" : "archived";
    const loadingKey = "bulkAction";

    message.loading({
      content: `Processing ${taskIds.length} tasks...`,
      key: loadingKey,
    });

    setTasks(
      tasks.map((task) =>
        taskIds.includes(task.id)
          ? {
              ...task,
              isDone: action === "done" ? true : task.isDone,
              isArchived: action === "archive" ? true : task.isArchived,
            }
          : task
      )
    );

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/bulk`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ids: taskIds,
            isDone: action === "done" ? true : undefined,
            isArchived: action === "archive" ? true : undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      message.success({
        content: `${taskIds.length} tasks ${actionText}`,
        key: loadingKey,
      });
      setSelectedRowKeys([]);
    } catch (error) {
      setTasks(prevTasks);
      setSelectedRowKeys(prevSelectedKeys);
      message.error({
        content: `Failed to ${actionText}. Changes reverted.`,
        key: loadingKey,
        duration: 5,
      });
      console.error("Bulk action failed:", error);
    }
  };

  return (
    <main className="container mx-auto p-4">
      <Card title="Email Tasks" className="mb-4">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <FilterBar
            tasks={tasks}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {selectedRowKeys.length > 0 && (
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleBulkAction(selectedRowKeys, "done")}
              >
                Mark Selected Done
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleBulkAction(selectedRowKeys, "archive")}
              >
                Archive Selected
              </Button>
            </Space>
          )}

          <TaskTable
            tasks={filteredTasks}
            loading={loading}
            page={page}
            total={total}
            selectedRowKeys={selectedRowKeys}
            onPageChange={setPage}
            onTaskClick={handleTaskClick}
            onSelectionChange={setSelectedRowKeys}
          />
        </Space>
      </Card>

      <TaskDrawer
        task={selectedTask}
        allTasks={tasks}
        onClose={handleCloseDrawer}
        onTaskUpdate={(updatedTask) => {
          setTasks((prevTasks) =>
            prevTasks.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            )
          );
          setSelectedTask(updatedTask);
        }}
      />
    </main>
  );
}
