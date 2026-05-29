# Ticketing System

A modern, full-stack ticketing management system designed to handle support requests, SLA compliance, and master data configuration with an elegant, responsive UI.

## 🚀 Tech Stack

### Backend
- **Framework**: NestJS
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Security**: JWT Authentication, Role-based Access Control (RBAC)

### Frontend
- **Framework**: React + Vite
- **Styling**: Tailwind CSS (with Light/Dark mode support)
- **State Management & Data Fetching**: TanStack Query (React Query)
- **Icons**: Phosphor Icons / Lucide

## ✨ Key Features

- **Robust Ticketing Engine**: Create, update, assign, and manage tickets efficiently.
- **SLA Compliance Tracking**: Automated calculation and monitoring of Time to First Response (TTFR) and Resolution Deadlines.
- **Dynamic Master Data Configuration**: 
  - Manage Ticket Types, Categories, and Master Service Groups directly from the Admin Dashboard.
  - Granular SLA Rules definitions.
  - Dynamically configured Status states (e.g., OPEN, IN_PROGRESS, RESOLVED).
- **Automated Workflows**: 
  - Automatic archiving and SLA timer halts when tickets are transitioned to 'RESOLVED'.
- **Role-Based Access Control**: Secure permission matrix with nested roles for Admins, Agents, and Customers.
- **Rich Interaction**: Internal notes, threaded messaging, and attachment uploads.
- **Premium UI/UX**: Fully responsive, high-contrast light and dark mode aesthetic featuring glassmorphism and modern layout structuring.

## 📦 Project Structure

The repository is structured as a monorepo containing both the backend and frontend.

```text
Ticketing-System/
├── frontend/             # React + Vite application
│   ├── src/
│   │   ├── api/          # Axios configuration and API interfaces
│   │   ├── features/     # Feature-based modular structure (admin, auth, tickets, etc.)
│   │   └── ...
│   └── ...
├── src/                  # NestJS backend application
│   ├── auth/             # Authentication & Authorization modules
│   ├── tickets/          # Ticketing core service and controllers
│   ├── master-config/    # Master data CRUD modules
│   └── ...
├── prisma/               # Database schema and migrations
└── ...
```

## 🛠 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Backend Setup

1. Install dependencies in the root directory:
   ```bash
   npm install
   ```

2. Configure Environment Variables:
   Create a `.env` file in the root directory and define your environment configurations.
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/ticketing-system"
   JWT_SECRET="your-super-secret-key"
   ```

3. Initialize the Database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
   *(Optional) Run the database seed to pre-populate necessary master data records:*
   ```bash
   npm run seed
   ```

4. Start the Backend Server:
   ```bash
   npm run start:dev
   ```
   The backend API will run on `http://localhost:3000`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Frontend Dev Server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

## 🛡 Authentication & Roles

The system is locked down via JWT. Different users get distinct views and capabilities:
- **Administrators**: Have access to Master Data configuration, the comprehensive active queue, SLA ledgers, and system configurations.
- **Agents**: Can process incoming queue items, respond to tickets, add internal notes, and manage attachments.
- **Customers**: Can create and monitor the lifecycle of their own service requests.

## 📄 License

This project is licensed under the MIT License.
