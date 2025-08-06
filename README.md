# CRM Next.js Application

This is a modern CRM (Customer Relationship Management) system built with Next.js, featuring a complete migration from the previous Express.js + React setup to a unified Next.js application.

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Authentication**: NextAuth.js with credentials provider
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: shadcn/ui with Tailwind CSS
- **Package Manager**: pnpm

## Features

- 🔐 Secure authentication with NextAuth.js
- 👥 Lead management (create, read, update, delete)
- 📅 Meeting scheduling and management
- ✅ Task management
- 📝 Notes system
- 📊 Dashboard with real-time statistics
- 🎨 Modern UI with shadcn/ui and Tailwind CSS
- 📱 Responsive design

## Database Schema

The application uses the following main entities:

- **Users**: System users with roles and authentication
- **Leads**: Sales prospects with contact information
- **Meetings**: Scheduled meetings linked to leads
- **Tasks**: Todo items associated with leads
- **Notes**: Text notes for leads

## Setup Instructions

### Prerequisites

1. PostgreSQL database server running
2. Node.js 18+ installed
3. pnpm package manager

### Installation

1. **Install dependencies:**

   ```bash
   cd crm-nextjs
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.local.example .env.local
   ```

   Update the `.env.local` file with your database credentials:

   ```env
   DATABASE_URL="postgresql://root:password@localhost:5432/crmdb"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   DB_NAME=crmdb
   DB_USER=root
   DB_PASS=password
   DB_HOST=localhost
   ```

3. **Generate Prisma client:**

   ```bash
   pnpm dlx prisma generate
   ```

4. **Migrate existing database (if needed):**
   ```bash
   pnpm dlx prisma db push
   ```

### Running the Application

1. **Development mode:**

   ```bash
   pnpm dev
   ```

2. **From root directory:**

   ```bash
   pnpm dev-nextjs
   ```

3. **All applications (original + new):**
   ```bash
   pnpm dev-all
   ```

The application will be available at `http://localhost:3000`

## API Routes

The application provides RESTful API routes:

### Leads

- `GET /api/leads` - Get all leads with filtering and pagination
- `POST /api/leads` - Create a new lead
- `GET /api/leads/[id]` - Get specific lead
- `PUT /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead

### Meetings

- `GET /api/meetings` - Get all meetings
- `POST /api/meetings` - Create a new meeting

### Tasks

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task

### Notes

- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create a new note

### Dashboard

- `GET /api/dashboard` - Get dashboard statistics

## Authentication

The application uses NextAuth.js with a credentials provider that authenticates against the existing user table. Users can sign in with their username and password.

## Database Connection

The application connects to the existing PostgreSQL database (`crmdb`) and uses the same tables as the original application. The Prisma schema is designed to match the existing Sequelize models.

## Migration Notes

This Next.js application is a complete migration from:

- **Backend**: Express.js → Next.js API routes
- **Frontend**: React with Vite → Next.js with App Router
- **ORM**: Sequelize → Prisma
- **UI Library**: Material-UI → shadcn/ui + Tailwind CSS
- **Authentication**: Custom JWT → NextAuth.js

## Key Differences from Original

1. **Unified codebase**: Frontend and backend in a single Next.js application
2. **Modern authentication**: NextAuth.js instead of custom JWT implementation
3. **Type-safe database access**: Prisma with TypeScript instead of Sequelize
4. **Modern UI components**: shadcn/ui components instead of Material-UI
5. **Better developer experience**: App Router, TypeScript, and modern tooling

## Development

The application is structured with:

- `/src/app` - App Router pages and API routes
- `/src/components` - Reusable UI components
- `/src/lib` - Utility functions and configurations
- `/prisma` - Database schema and migrations

## Troubleshooting

1. **Database connection issues**: Verify PostgreSQL is running and credentials are correct
2. **Authentication issues**: Check NEXTAUTH_SECRET is set and database has user records
3. **Build issues**: Ensure all dependencies are installed with `pnpm install`

## Future Enhancements

- Add comprehensive form validation
- Implement advanced filtering and search
- Add file upload capabilities
- Email integration for meetings and tasks
- Real-time notifications
- Export functionality (CSV, PDF)
- Advanced reporting and analytics
