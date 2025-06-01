export interface Task {
  id: string;
  subject: string;
  from: string;
  body: string;
  labels: string[];
  confidence: number;
  taskType: string;
  isDone: boolean;
  isArchived: boolean;
  messageId: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassificationResult {
  taskType: string;
  labels: string[];
  confidence: number;
}
