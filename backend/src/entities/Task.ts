import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
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
