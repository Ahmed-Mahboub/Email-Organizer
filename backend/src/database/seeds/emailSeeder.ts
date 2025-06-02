import { DataSource } from "typeorm";
import { Task } from "../../entities/Task";
import { faker } from "@faker-js/faker";

const POSSIBLE_LABELS = [
  "urgent",
  "work",
  "meeting",
  "project",
  "deadline",
  "invoice",
  "contract",
  "hr",
  "question",
  "feedback",
  "general",
];

export async function seedEmails(dataSource: DataSource, count: number = 10) {
  const taskRepository = dataSource.getRepository(Task);

  const emails = Array.from({ length: count }, () => {
    const messageId = faker.string.uuid();
    const subject = faker.lorem.sentence();
    const from = faker.internet.email();
    const body = faker.lorem.paragraphs(2);
    const date = faker.date.recent();

    // Randomly select 1-3 labels
    const numLabels = faker.number.int({ min: 1, max: 3 });
    const labels = faker.helpers.arrayElements(POSSIBLE_LABELS, numLabels);
    const confidence = faker.number.float({
      min: 0.5,
      max: 0.95,
      fractionDigits: 2,
    });

    return {
      messageId,
      subject,
      from,
      labels,
      confidence,
      body,
      isDone: false,
      isArchived: false,
      receivedAt: date,
      createdAt: date,
      updatedAt: date,
    };
  });

  try {
    await taskRepository.save(emails);
    console.log(`Successfully seeded ${count} emails`);
  } catch (error) {
    console.error("Error seeding emails:", error);
    throw error;
  }
}
