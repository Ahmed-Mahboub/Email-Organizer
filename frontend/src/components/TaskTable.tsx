import { Table, Space, Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  InboxOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { Task } from "@/types";
import dayjs from "dayjs";

interface TaskTableProps {
  tasks: Task[];
  loading: boolean;
  page: number;
  total: number;
  selectedRowKeys: string[];
  onPageChange: (page: number) => void;
  onTaskClick: (task: Task) => void;
  onSelectionChange: (keys: string[]) => void;
}

const PAGE_SIZE = 50;

export function TaskTable({
  tasks,
  loading,
  page,
  total,
  selectedRowKeys,
  onPageChange,
  onTaskClick,
  onSelectionChange,
}: TaskTableProps) {
  const columns = [
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

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="id"
      loading={loading}
      pagination={{
        current: page,
        pageSize: PAGE_SIZE,
        total: total,
        onChange: onPageChange,
        showSizeChanger: false,
        showTotal: (total) => `Total ${total} items`,
      }}
      onRow={(record) => ({
        onClick: () => onTaskClick(record),
      })}
      rowSelection={{
        selectedRowKeys,
        onChange: (keys) => onSelectionChange(keys as string[]),
      }}
    />
  );
}
