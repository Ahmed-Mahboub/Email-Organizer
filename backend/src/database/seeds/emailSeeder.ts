import { DataSource } from "typeorm";
import { Task } from "../../entities/Task";
import { faker } from "@faker-js/faker";

export async function seedEmails(dataSource: DataSource, count: number = 40) {
  const taskRepository = dataSource.getRepository(Task);

  const emails = Array.from({ length: count }, () => {
    const messageId = faker.string.uuid();
    const subject = faker.lorem.sentence();
    const from = faker.internet.email();
    const body = faker.lorem.paragraphs(2);
    const date = faker.date.recent();

    /**@Entity()
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  subject!: string;

  @Column()
  from!: string;

  @Column("simple-array")
  labels!: string[];

  @Column("float")
  confidence!: number;

  @Column({ type: "text", nullable: true })
  body?: string;

  @Column({ default: false })
  isDone!: boolean;

  @Column({ default: false })
  isArchived!: boolean;

  @Column({ unique: true })
  messageId!: string;

  @CreateDateColumn()
  receivedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
 */
    return {
      messageId,
      subject,
      from,
      labels: [],
      confidence: 0,
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
