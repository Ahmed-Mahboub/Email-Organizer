"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Space,
  Button,
  Tag,
  Drawer,
  DatePicker,
  Select,
  Input,
  message,
  // Checkbox,
  Tooltip,
} from "antd";
import {
  CheckOutlined,
  DeleteOutlined,
  MailOutlined,
  CheckCircleOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Task } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import dayjs from "dayjs";
import DOMPurify from "dompurify";

const { Search } = Input;

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

  const columns = [
    // {
    //   title: "Select",
    //   key: "select",
    //   width: 50,
    //   render: (_: unknown, record: Task) => (
    //     <Checkbox
    //       checked={selectedRowKeys.includes(record.id)}
    //       onChange={(e) => {
    //         if (e.target.checked) {
    //           setSelectedRowKeys([...selectedRowKeys, record.id]);
    //         } else {
    //           setSelectedRowKeys(
    //             selectedRowKeys.filter((id) => id !== record.id)
    //           );
    //         }
    //       }}
    //       onClick={(e) => e.stopPropagation()}
    //     />
    //   ),
    // },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (text: string) => (
        <Space>
          <MailOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: "From",
      dataIndex: "from",
      key: "from",
    },
    {
      title: "Labels",
      dataIndex: "labels",
      key: "labels",
      render: (labels: string[]) => (
        <Space>
          {labels.map((label) => (
            <Tag key={label} color="blue">
              {label}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Confidence",
      dataIndex: "confidence",
      key: "confidence",
      render: (confidence: number) => `${(confidence * 100).toFixed(1)}%`,
    },
    {
      title: "Received",
      dataIndex: "receivedAt",
      key: "receivedAt",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_: unknown, record: Task) => (
        <Space>
          <Tooltip title={record.isDone ? "Done" : "Not Done"}>
            <CheckCircleOutlined
              style={{
                color: record.isDone ? "#52c41a" : "#d9d9d9",
                fontSize: "16px",
              }}
            />
          </Tooltip>
          <Tooltip title={record.isArchived ? "Archived" : "Not Archived"}>
            <InboxOutlined
              style={{
                color: record.isArchived ? "#ff4d4f" : "#d9d9d9",
                fontSize: "16px",
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

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
      searchParams.append("skip", String((page - 1) * PAGE_SIZE));
      searchParams.append("take", String(PAGE_SIZE));
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tasks?${searchParams}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTasks(data.tasks || data);
        setFilteredTasks(data.tasks || data);
        setTotal(data.total || data.length || 0);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        message.error("Failed to fetch tasks");
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [filters.labels, filters.startDate, filters.endDate, page]);

  // Client-side search
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
        const newTasks = [...message.data.tasks!, ...prevTasks];
        return newTasks.slice(0, 20);
      });
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
    // Store previous state for rollback
    const prevTasks = [...tasks];
    const prevSelectedKeys = [...selectedRowKeys];
    const actionText = action === "done" ? "marked as done" : "archived";
    const loadingKey = "bulkAction";

    // Optimistic update
    message.loading({
      content: `Processing ${taskIds.length} tasks...`,
      key: loadingKey,
    });

    // Update UI immediately
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const responseData = await response.json();
      const updatedTasks = Array.isArray(responseData)
        ? responseData
        : responseData.tasks || [];

      // Update with server response
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          const updatedTask = updatedTasks.find((t: Task) => t.id === task.id);
          return updatedTask || task;
        })
      );

      message.success({
        content: `${taskIds.length} tasks ${actionText}`,
        key: loadingKey,
      });
      setSelectedRowKeys([]);
    } catch (error) {
      // Rollback on error
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
          <Space wrap>
            <Space>
              <DatePicker
                placeholder="Start Date"
                onChange={(date) => {
                  handleFilterChange({
                    ...filters,
                    startDate: date?.toISOString() || "",
                  });
                }}
              />
              <DatePicker
                placeholder="End Date"
                onChange={(date) => {
                  handleFilterChange({
                    ...filters,
                    endDate: date?.toISOString() || "",
                  });
                }}
              />
            </Space>
            <Select
              mode="multiple"
              placeholder="Select labels"
              style={{ width: 200 }}
              onChange={(values) =>
                handleFilterChange({ ...filters, labels: values })
              }
            >
              {Array.from(new Set(tasks.flatMap((t) => t.labels))).map(
                (label) => (
                  <Select.Option key={label} value={label}>
                    {label}
                  </Select.Option>
                )
              )}
            </Select>
            <Search
              placeholder="Search tasks"
              allowClear
              onChange={(e) =>
                handleFilterChange({ ...filters, search: e.target.value })
              }
              style={{ width: 200 }}
            />
          </Space>

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

          <Table
            columns={columns}
            dataSource={filteredTasks}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: total,
              onChange: setPage,
            }}
            onRow={(record) => ({
              onClick: () => handleTaskClick(record),
            })}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as string[]),
            }}
          />
        </Space>
      </Card>

      <Drawer
        title="Task Details"
        placement="right"
        onClose={handleCloseDrawer}
        open={!!selectedTask}
        width={600}
      >
        {selectedTask && (
          <div>
            <h2>{selectedTask.subject}</h2>
            <p>From: {selectedTask.from}</p>
            <p>
              Received:{" "}
              {dayjs(selectedTask.receivedAt).format("YYYY-MM-DD HH:mm")}
            </p>
            <div>
              <h3>Labels:</h3>
              <Space wrap>
                {selectedTask.labels.map((label) => (
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
                    value={selectedTask.labels}
                    onChange={(newLabels) => {
                      setSelectedTask({ ...selectedTask, labels: newLabels });
                    }}
                  >
                    {Array.from(new Set(tasks.flatMap((t) => t.labels))).map(
                      (label) => (
                        <Select.Option key={label} value={label}>
                          {label}
                        </Select.Option>
                      )
                    )}
                  </Select>
                  <Button
                    type="primary"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `${process.env.NEXT_PUBLIC_API_URL}/tasks/${selectedTask.id}`,
                          {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              labels: selectedTask.labels,
                            }),
                          }
                        );
                        if (!response.ok)
                          throw new Error("Failed to update labels");
                        const updatedTask = await response.json();
                        setTasks((prevTasks) =>
                          prevTasks.map((task) =>
                            task.id === selectedTask.id ? updatedTask : task
                          )
                        );
                        setSelectedTask(updatedTask);
                        message.success("Labels updated successfully");
                      } catch (error) {
                        message.error("Failed to update labels");
                        console.error("Failed to update labels:", error);
                      }
                    }}
                  >
                    Apply Labels
                  </Button>
                </Space>
              </div>
            </div>
            <div className="mt-4">
              <h3>Content:</h3>
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(selectedTask.body),
                }}
              />
            </div>
            <div className="mt-4">
              <h3>Classification:</h3>
              <pre className="bg-gray-100 p-4 rounded">
                {JSON.stringify(
                  {
                    taskType: selectedTask.taskType,
                    labels: selectedTask.labels,
                    confidence: selectedTask.confidence,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </main>
  );
}
