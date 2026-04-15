# InvenTrack

InvenTrack is a modern web application built with [Next.js](https://nextjs.org/), Prisma CRM, and Tailwind CSS. It is designed to help you explicitly track, label, and manage your institution's assets and inventory efficiently.

---

## 🛠️ Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: Version **20.x** or **22.x** (LTS recommended).
- **Package Manager**: npm.
- **Database**: PostgreSQL (e.g., Supabase, local PostgreSQL, etc.).
- **Storage**: MinIO (Self-hosted S3 compatible storage) for handling file uploads like images and logos.
- **AI Integration**: Google Gemini API Key (required for AI image extraction features).

---

## 🚀 Getting Started

Follow these steps to set up the project locally for development.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd inventrack
```

### 2. Install Dependencies

Install the necessary Node packages using npm:

```bash
npm install
```

### 3. Environment Variables Configuration

Copy the sample environment file to create your own configuration:

```bash
cp .env.example .env
```

Open the `.env` file and fill in required values. Key variables include:

- `DATABASE_URL`: Your PostgreSQL connection string. _(Use port 5432 for standard use, or 6543 for serverless)._
- `AUTH_SECRET`: Generate a secure key by running `npx auth secret`.
- MinIO configuration variables: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, etc.
- `GEMINI_API_KEY`: Your Gemini AI API token for image extraction.
- `NEXT_PUBLIC_APP_URL`: Set this to `http://localhost:3000` for local development.

### 4. Database Setup & Migrations

After configuring your database URL in `.env`, run the Prisma migration to build your database schema:

```bash
npm run db:migrate
```

_(Alternatively, you can use `npm run db:push` if you are rapidly prototyping and just want to sync the schema without migration files)._

### 5. Data Seeding

To populate your database with the necessary initial data (such as default users, roles, or settings):

```bash
npm run db:seed
```

### 6. Run the Development Server

Start the application in development mode:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📜 Available Scripts

This project includes several helpful npm scripts:

| Command                     | Description                                                                |
| :-------------------------- | :------------------------------------------------------------------------- |
| `npm run dev`               | Starts the Next.js development server with hot-reload.                     |
| `npm run build`             | Builds the Next.js application for production.                             |
| `npm run start`             | Starts a Node.js server for the production build.                          |
| `npm run lint`              | Runs ESLint to identify and fix code issues.                               |
| `npm run db:generate`       | Generates the Prisma Client based on the schema.                           |
| `npm run db:migrate`        | Applies database migrations (local dev).                                   |
| `npm run db:migrate:deploy` | Applies existing migrations without recreating them (used for production). |
| `npm run db:push`           | Pushes the schema state to the database directly.                          |
| `npm run db:seed`           | Seeds the database with default data.                                      |
| `npm run db:studio`         | Opens Prisma Studio (a visual database browser) at `localhost:5555`.       |

---

## 💻 Tech Stack

- **Framework**: [Next.js 15+ App Router](https://nextjs.org)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **UI Library**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Authentication**: [NextAuth.js v5 (beta)](https://authjs.dev/)
- **Charts & Reporting**: [ApexCharts](https://apexcharts.com/), [React PDF](https://react-pdf.org/)
