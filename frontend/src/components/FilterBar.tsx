import { Space, Select, Input, DatePicker } from "antd";
import { Task } from "@/types";

const { Search } = Input;

interface FilterBarProps {
  tasks: Task[];
  filters: {
    labels: string[];
    startDate: string;
    endDate: string;
    search: string;
  };
  onFilterChange: (filters: {
    labels: string[];
    startDate: string;
    endDate: string;
    search: string;
  }) => void;
}

export function FilterBar({ tasks, filters, onFilterChange }: FilterBarProps) {
  return (
    <Space wrap>
      <Space>
        <DatePicker
          placeholder="Start Date"
          onChange={(date) => {
            onFilterChange({
              ...filters,
              startDate: date?.toISOString() || "",
            });
          }}
        />
        <DatePicker
          placeholder="End Date"
          onChange={(date) => {
            onFilterChange({
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
        value={filters.labels}
        onChange={(values) => onFilterChange({ ...filters, labels: values })}
      >
        {Array.from(new Set(tasks.flatMap((t) => t.labels))).map((label) => (
          <Select.Option key={label} value={label}>
            {label}
          </Select.Option>
        ))}
      </Select>
      <Search
        placeholder="Search tasks"
        allowClear
        value={filters.search}
        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        style={{ width: 200 }}
      />
    </Space>
  );
}
