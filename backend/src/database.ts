import { DataSource } from "typeorm";
import { Task } from "./entities/Task";
import { logger } from "./utils/logger";
import dotenv from "dotenv";
dotenv.config();

import { seedEmails } from "./database/seeds/emailSeeder";

const AppDataSource = new DataSource({
  type: process.env.DATABASE_TYPE === "sqlite" ? "sqlite" : "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "",
  database: process.env.DATABASE_NAME || "email_organizer",
  synchronize: process.env.NODE_ENV === "development",
  logging: process.env.NODE_ENV === "development",
  entities: [Task],
  subscribers: [],
  migrations: [],
});

export async function setupDatabase() {
  try {
    await AppDataSource.initialize();
    logger.info("Database connection initialized");
  } catch (error) {
    logger.error("Error initializing database connection:", error);
    throw error;
  }
}

export { AppDataSource, seedEmails };
