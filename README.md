# Smart Success — Team Portal

Internal team management portal for Smart Success IT.

## Features

- **Petty Cash** — Cash in/out tracking with approval workflow
- **Daily Report** — Sales, purchases and expenses per team member
- **Tasks** — Kanban board with two views (My Tasks / All Tasks)
- **Roles** — Team structure and responsibilities
- **My Profile** — Self-service name editing and PIN change
- **Control Panel** — Admin: users, access, categories, permissions

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** MySQL
- **Frontend:** Vanilla JS (modular, no framework)
- **Auth:** JWT + bcrypt PIN hashing

---

## Hostinger Deployment (GitHub)

### 1. Fork / clone this repo to your GitHub account

### 2. Create MySQL database on Hostinger
- hPanel → Databases → MySQL Databases
- Create database, user, assign full privileges
- Note: database name, username, password

### 3. Create Node.js app on Hostinger
- hPanel → Node.js → Create Application
- Node.js version: **18** or higher
- Application startup file: `backend/server.js`
- Connect to your GitHub repo

### 4. Set environment variables in Hostinger
In hPanel → Node.js → your app → **Environment Variables**, add:

| Variable     | Value                          |
|--------------|-------------------------------|
| `DB_HOST`    | `localhost`                   |
| `DB_PORT`    | `3306`                        |
| `DB_NAME`    | your database name            |
| `DB_USER`    | your database username        |
| `DB_PASS`    | your database password        |
| `JWT_SECRET` | a long random string (32+ chars) |
| `PORT`       | `3000`                        |

### 5. Run database setup (one time only)
In hPanel → Node.js → Terminal:
```bash
node backend/setup.js
```

### 6. Start / Restart the app
Click **Restart** in hPanel → Node.js.

---

## Default Login PINs

| Name     | PIN  | Role                 |
|----------|------|----------------------|
| Shahzaib | 1234 | Admin                |
| Riyad    | 2345 | General Manager      |
| Azzam    | 3456 | Shop Operations      |
| Hussam   | 4567 | Field Technician     |
| Shahdat  | 5678 | Sales Representative |

**Change all PINs after first login.**

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/smart-success.git
cd smart-success

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your local MySQL credentials

# 4. Setup DB
node backend/setup.js

# 5. Run
npm start
# → http://localhost:3000
```

## Auto-Deploy on Push

Once connected to Hostinger via GitHub:
- Any push to the `main` branch → Hostinger pulls and restarts automatically
- No manual file uploads ever again
