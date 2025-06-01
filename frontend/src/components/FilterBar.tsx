import { useState } from "react";

interface FilterBarProps {
  filters: {
    labels: string[];
    startDate: string;
    endDate: string;
    search: string;
  };
  onFilterChange: (filters: FilterBarProps["filters"]) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [newLabel, setNewLabel] = useState("");

  const handleAddLabel = () => {
    if (newLabel && !filters.labels.includes(newLabel)) {
      onFilterChange({
        ...filters,
        labels: [...filters.labels, newLabel],
      });
      setNewLabel("");
    }
  };

  const handleRemoveLabel = (label: string) => {
    onFilterChange({
      ...filters,
      labels: filters.labels.filter((l) => l !== label),
    });
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search in subject or body..."
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              onFilterChange({ ...filters, startDate: e.target.value })
            }
            className="px-4 py-2 border rounded-lg"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              onFilterChange({ ...filters, endDate: e.target.value })
            }
            className="px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add label..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddLabel()}
            className="px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleAddLabel}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.labels.map((label) => (
            <span
              key={label}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
            >
              {label}
              <button
                onClick={() => handleRemoveLabel(label)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
