# Email Organizer

A full-stack TypeScript application for triaging and organizing emails, featuring real-time updates, advanced filtering, and robust backend logic.  
**Runs with a single `docker-compose up`.**

**Note:** This project uses the Gmail API (not IMAP) for email ingestion and watching. You do not need to configure IMAP.

---

## Table of Contents

- [Email Organizer](#email-organizer)
  - [Table of Contents](#table-of-contents)
  - [How to Run](#how-to-run)
  - [Alternative Manual Run (if Docker Compose does not work)](#alternative-manual-run-if-docker-compose-does-not-work)
  - [First Run Screenshot](#first-run-screenshot)
  - [Environment Setup](#environment-setup)
    - [Backend (`backend/.env`)](#backend-backendenv)
    - [Frontend (`frontend/.env.local`)](#frontend-frontendenvlocal)
  - [Authentication (Email OAuth)](#authentication-email-oauth)
  - [Docker \& Docker Compose](#docker--docker-compose)
  - [API Endpoints \& Features](#api-endpoints--features)
    - [Task List \& Filtering](#task-list--filtering)
      - [UI Features](#ui-features)
    - [Bulk Operations](#bulk-operations)
    - [Task Drawer \& Re-label](#task-drawer--re-label)
    - [WebSocket Real-Time Updates](#websocket-real-time-updates)
    - [Exponential Backoff \& Batch Mode](#exponential-backoff--batch-mode)
    - [Metrics](#metrics)
  - [Testing](#testing)
  - [Screenshots](#screenshots)
  - [Bonus Features](#bonus-features)
  - [Supported Features \& Endpoints (Summary Table)](#supported-features--endpoints-summary-table)

---

## How to Run

1. **Clone the repository:**

   ```bash
   git clone <your-repo-url>
   cd <your-repo>
   ```

2. **Create environment files (see below).**

3. **Start the app:**
   ```bash
   docker-compose up --build
   ```
   - The frontend will be available at [http://localhost:3000](http://localhost:3000)
   - The backend API at [http://localhost:3001](http://localhost:3001)

---

## Alternative Manual Run (if Docker Compose does not work)

1. **Create the database manually in Postgres:**

   - Create a database named `email_organizer` using your preferred Postgres tool or:
     ```sql
     CREATE DATABASE email_organizer;
     ```

2. **Run the backend:**

   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Run the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## First Run Screenshot

![Image](https://github.com/user-attachments/assets/d7423982-4a1d-4bbf-99dc-89b6f2fa6e8e)
---

## Environment Setup

### Backend (`backend/.env`)

```
# Database Configuration
DATABASE_TYPE=postgres
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=109110
DATABASE_NAME=email_organizer

# Server Configuration
PORT=3001
NODE_ENV=development

# Gmail API Configuration
GOOGLE_CLIENT_ID=579954597168-234tm11th6f3tjleldhv7nn9ckh9tnpj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET="example_secret"
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_PROJECT_ID=emailorganizer-461511
GOOGLE_TOPIC_NAME=email_notifications
GOOGLE_REFRESH_TOKEN="example_token"
# Classifier Configuration
CLASSIFIER_ENDPOINT=http://localhost:3002/classify
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Authentication (Email OAuth)

To connect your email account, use the `/auth` endpoint:

**Example:**

```http
POST /auth/google
Content-Type: application/json

{"authUrl":"https://accounts.google.com/o/oauth2/v2/auth?some_thing}
```

then go to the `authUrl` and login this will lead to response with refresh token use it in the .env file

```
{
  "message":"Authentication successful","refresh_token":"example_token"
}
```

- The backend will store the credentials and use them to watch your inbox for new messages.

---

## Docker & Docker Compose

**Key files:**

- `docker-compose.yml` (root)
- `backend/Dockerfile`
- `frontend/Dockerfile`

**Sample `docker-compose.yml` snippet:**

```yaml
version: "3.8"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_TYPE=postgres
      - DATABASE_HOST=db
      - DATABASE_PORT=5432
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=password
      - DATABASE_NAME=email_organizer
      - PORT=3001
      - GOOGLE_CLIENT_ID=dummy-client-id.apps.googleusercontent.com
      - GOOGLE_CLIENT_SECRET=dummy-client-secret
      - GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
      - GOOGLE_PROJECT_ID=dummy-project-id
      - GOOGLE_TOPIC_NAME=dummy-topic-name
      - GOOGLE_REFRESH_TOKEN=dummy-refresh-token
      - CLASSIFIER_ENDPOINT=http://localhost:3002/classify
    depends_on:
      - db
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    depends_on:
      - backend
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=email_organizer
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
```

---

## API Endpoints & Features

### Task List & Filtering

- **GET `/tasks`**

  - Returns paginated, triaged email tasks.
  - Supports filtering by label, date range, and pagination.
  - **Query params:**
    - `labels=work,urgent`
    - `startDate=2024-01-01`
    - `endDate=2024-01-31`
    - `page=1`
    - `pageSize=50`
  - **Example:**
    ```
    GET /tasks?labels=work,urgent&page=1&pageSize=50
    ```

- **Client-side full-text search** on subject/body.

#### UI Features

- Multi-select label filter (chip style)
- Date range selector
- Search bar

**Screenshot:**
![Image](https://github.com/user-attachments/assets/fd83e9f3-d527-46c4-94ba-e9e5354b0456

![Image](https://github.com/user-attachments/assets/c450ca84-eb6c-4bc6-a396-3f53625d8699)

![Image](https://github.com/user-attachments/assets/6a12019d-fa12-4e24-9478-2f1aad787eb1)

### Bulk Operations

- **PATCH `/tasks/bulk`**
  - Mark multiple tasks as done or archived.
  - **Body:**
    ```json
    {
      "ids": ["id1", "id2"],
      "isDone": true,
      "isArchived": false
    }
    ```
  - **Optimistic UI:** Updates immediately, rolls back on 4xx/5xx errors.

**Screenshot:**
![Image](https://github.com/user-attachments/assets/be5e67f7-5739-497a-a052-9e9b9d5bee62)

![Image](https://github.com/user-attachments/assets/f6ed88b3-02f9-4268-9b47-de1c231d60b6)

### Task Drawer & Re-label

- **Clicking a row** opens a drawer with:
  - Sanitized HTML preview of the email body.
  - Pretty-printed classification JSON.
  - **Re-label dropdown** (multi-select) with an **Apply** button.
  - **PATCH `/tasks/:id`** to update labels.

**Screenshot:**
![Image](https://github.com/user-attachments/assets/62358fe8-3967-43bb-8318-e6adcab001e1)

### WebSocket Real-Time Updates

- **WebSocket endpoint:** `ws://localhost:3001`
- **Receives:** New tasks, updates, and bulk changes in real time.
- **Frontend usage:**
  ```ts
  useWebSocket((message) => {
    if (message.type === "taskUpdate" && message.data.task) {
    }
  });
  ```
- **Backend broadcast example:**
  ```ts
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "taskUpdate",
          data: { task: updatedTask },
        })
      );
    }
  });
  ```

### Exponential Backoff & Batch Mode

- The backend implements exponential backoff and batch mode for calling the `/classify` endpoint (mock LLM):
  - **Batch size:** Up to 8 messages per batch
  - **Rate limit:** 50 requests per minute
  - **Backoff:** If the rate limit is hit, the system waits and retries with increasing delay (up to 30 seconds)
- **Why:** This ensures the backend never exceeds the LLM rate limit and handles spikes gracefully.
- **Code Snippet:**
  ```ts
  class RateLimiter {
    async waitForToken(): Promise<void> {
      this.refillTokens();
      let backoff = 1000;
      while (this.tokens <= 0) {
        await new Promise((resolve) => setTimeout(resolve, backoff));
        this.refillTokens();
        backoff = Math.min(backoff * 2, 30000);
      }
      this.tokens--;
    }
    // ...
  }
  // Usage in GmailWatcher:
  await classifyRateLimiter.waitForToken();
  ```
- **Batching:**
  ```ts
  const batch = this.processingQueue.splice(0, this.batchSize); // batchSize = 8
  await Promise.all(batch.map(...));
  ```

### Metrics

- **GET `/metrics`**
  - Prometheus format metrics for monitoring.

**Screenshot:**
![Image](https://github.com/user-attachments/assets/cd852ea5-2f61-4f05-a3d9-22892aa07f2a)

---

## Testing

- **Unit tests:** Run with `npm test` in the backend folder.
  - **Covers:**
    - Task creation and retrieval
    - Filtering by label and date
    - Bulk update (done/archive)
    - Relabeling tasks
    - Uniqueness/idempotency (no duplicate tasks)
    - Error handling (invalid IDs, not found, etc.)
- **E2E test:** Validates the full flow from email ingestion to task triage.

---

## Bonus Features

- **Idempotency:** No duplicate tasks on restarts.
- **WebSocket:** Real-time UI updates.
- **Prometheus metrics endpoint.**

---

## Supported Features & Endpoints (Summary Table)

| Feature                          | Endpoint/Component               | Description                                               |
| -------------------------------- | -------------------------------- | --------------------------------------------------------- |
| Task List                        | `GET /tasks`                     | Paginated, filterable, searchable list of triaged emails  |
| Bulk Actions                     | `PATCH /tasks/bulk`              | Mark as done/archive multiple tasks, optimistic UI        |
| Task Drawer                      | Drawer UI, `PATCH /tasks/:id`    | View details, re-label, pretty JSON, HTML preview         |
| Filtering & searching            | FilterBar component              | Multi-label, date range, search                           |
| WebSocket Updates                | WebSocket API                    | Real-time push of new/updated tasks                       |
| Exponential Backoff & Batch Mode | Backend GmailWatcher `/classify` | LLM endpoint batching and rate limiting (8/batch, 50/min) |
| Metrics                          | `GET /metrics`                   | Prometheus metrics                                        |
| Authentication                   | `POST /auth`                     | Connect your email account (OAuth)                        |
