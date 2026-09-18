# SocietyNest

A full-stack college society recruitment app built for the GDG NSUT DEV membership task.

## Stack
- Frontend: HTML, CSS, Bootstrap 5, JavaScript
- Backend: Node.js, Express
- Database: MySQL
- Authentication: JWT stored in an HttpOnly cookie
- Passwords: bcrypt hashing

## Core Features
- Student registration and login
- Secure password hashing
- Student application management
- Society search and category filtering
- Admin-only society CRUD
- Admin applicant list and application status updates
- Server-side deadline validation
- Role-protected backend APIs
- Loading, success and error feedback

## Project Structure

```text
SocietyNest/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── society.html
│   ├── applications.html
│   ├── admin.html
│   ├── css/style.css
│   └── js/
│       ├── main.js
│       ├── auth.js
│       ├── society.js
│       ├── applications.js
│       └── admin.js
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   └── middleware/auth.js
├── database/
│   ├── database.sql
│   └── seed.sql
├── .env.example
├── .gitignore
└── README.md
```

## Setup

### 1. Create the database
Open MySQL Workbench and run `database/database.sql`.

Optional: run `database/seed.sql` to add sample societies for local testing.

### 2. Configure environment variables
Copy `.env.example` to `.env` in the project root.

For the default NSUT/Windows setup used while building this project:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=societynest
DB_PORT=3307
JWT_SECRET=change_this_to_a_long_random_secret
NODE_ENV=development
```

Put your actual MySQL password in `DB_PASSWORD` if you have one.

### 3. Install backend packages

PowerShell:

```powershell
cd backend
npm.cmd install
```

### 4. Start the server

```powershell
node server.js
```

Open:

`http://localhost:5000`

Do NOT open `index.html` directly with `file://` and do not use Live Server for the final integrated test. Express serves the frontend and API from the same origin.

## Making an Admin

1. Register a normal student account from the website.
2. In MySQL Workbench run:

```sql
USE societynest;
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

3. Log out and log in again so the new role is included in the JWT.

## API Overview

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Societies
- `GET /api/societies`
- `GET /api/societies/:id`
- `POST /api/societies` (admin)
- `PUT /api/societies/:id` (admin)
- `DELETE /api/societies/:id` (admin)

### Applications
- `POST /api/applications` (student)
- `GET /api/applications/my` (student)
- `GET /api/societies/:id/applicants` (admin)
- `PATCH /api/applications/:id/status` (admin)

## Notes for Submission
- Keep `.env` out of GitHub. `.gitignore` already excludes it.
- Replace or remove the optional sample societies before final submission if your team needs only real institute societies.
- The project intentionally keeps the core task scope and does not add the optional bonus features.
