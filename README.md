# Email Organizer

A full-stack TypeScript application for triaging and organizing emails, featuring real-time updates, advanced filtering, and robust backend logic.  
**Runs with a single `docker-compose up`.**

---

## Table of Contents

- [How to Run](#how-to-run)
- [Environment Setup](#environment-setup)
- [Authentication (Email OAuth)](#authentication-email-oauth)
- [Docker & Docker Compose](#docker--docker-compose)
- [API Endpoints & Features](#api-endpoints--features)
  - [Task List & Filtering](#task-list--filtering)
  - [Bulk Operations](#bulk-operations)
  - [Task Drawer & Re-label](#task-drawer--re-label)
  - [WebSocket Real-Time Updates](#websocket-real-time-updates)
  - [Metrics](#metrics)
- [Testing](#testing)
- [Screenshots](#screenshots)
- [Bonus Features](#bonus-features)

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

## Environment Setup

### Backend (`backend/.env`)

```
DATABASE_TYPE=postgres
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=109110
DATABASE_NAME=email_organizer
PORT=3001
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
POST /auth
Content-Type: application/json

{
  "email": "your-email@gmail.com",
  "clientId": "...",
  "clientSecret": "...",
  "refreshToken": "..."
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
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_TYPE=postgres
      - DATABASE_HOST=db
      - DATABASE_PORT=5432
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=109110
      - DATABASE_NAME=email_organizer
      - PORT=3001
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    depends_on:
      - backend

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=109110
      - POSTGRES_DB=email_organizer
    ports:
      - "5432:5432"
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

### Task Drawer & Re-label

- **Clicking a row** opens a drawer with:
  - Sanitized HTML preview of the email body.
  - Pretty-printed classification JSON.
  - **Re-label dropdown** (multi-select) with an **Apply** button.
  - **PATCH `/tasks/:id`** to update labels.

### WebSocket Real-Time Updates

- **WebSocket endpoint:** `ws://localhost:3001`
- **Receives:** New tasks, updates, and bulk changes in real time.
- **Frontend usage:**
  ```ts
  useWebSocket((message) => {
    if (message.type === "taskUpdate" && message.data.task) {
      // update task in UI
    }
    // ...handle other message types
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

### Metrics

- **GET `/metrics`**
  - Prometheus format metrics for monitoring.

---

## Testing

- **Unit tests:** Run with `npm test` in the backend folder.
- **E2E test:** Validates the full flow from email ingestion to task triage.

---

## Screenshots

> _You can add screenshots here for:_
>
> - Bulk operation selection and actions
> - Search/filter bar
> - Task drawer with HTML preview and classification
> - Pagination controls

---

## Bonus Features

- **Exponential backoff & batch mode** for LLM endpoint (≤8 messages per batch, 50 req/min limit).
- **Idempotency:** No duplicate tasks on restarts.
- **WebSocket:** Real-time UI updates.
- **Prometheus metrics endpoint.**

---

## Supported Features & Endpoints (Summary Table)

| Feature           | Endpoint/Component            | Description                                              |
| ----------------- | ----------------------------- | -------------------------------------------------------- |
| Task List         | `GET /tasks`                  | Paginated, filterable, searchable list of triaged emails |
| Bulk Actions      | `PATCH /tasks/bulk`           | Mark as done/archive multiple tasks, optimistic UI       |
| Task Drawer       | Drawer UI, `PATCH /tasks/:id` | View details, re-label, pretty JSON, HTML preview        |
| Filtering         | FilterBar component           | Multi-label, date range, search                          |
| WebSocket Updates | WebSocket API                 | Real-time push of new/updated tasks                      |
| Metrics           | `GET /metrics`                | Prometheus metrics                                       |
| Authentication    | `POST /auth`                  | Connect your email account (OAuth)                       |

---

**For any issues, please open an issue or contact the maintainer.**
