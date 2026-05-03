# Smart Success Portal — Hostinger Deployment Guide

## What's in this package

```
smart-success/
├── backend/
│   ├── server.js          ← Main Node.js server (entry point)
│   ├── setup.js           ← Run once to create DB tables and seed data
│   ├── db.js              ← MySQL connection pool
│   ├── middleware/
│   │   └── auth.js        ← JWT authentication
│   └── routes/
│       ├── users.js       ← User management API
│       ├── petty-cash.js  ← Petty cash API
│       ├── tasks.js       ← Tasks API
│       ├── daily-report.js← Daily report API
│       └── settings.js    ← Settings API
├── frontend/
│   ├── index.html         ← Single page shell
│   ├── css/theme.css      ← All styles
│   ├── js/
│   │   ├── api.js         ← Centralised API client
│   │   └── app.js         ← Core: auth, routing, i18n, theme
│   └── apps/
│       ├── petty-cash/    ← Petty Cash module
│       ├── daily-report/  ← Daily Report module
│       ├── tasks/         ← Tasks module
│       ├── roles/         ← Roles module
│       ├── profile/       ← My Profile module
│       └── control-panel/ ← Admin Control Panel module
├── package.json
├── .env.example
└── DEPLOY.md              ← This file
```

---

## Step 1 — Create MySQL Database on Hostinger

1. Log in to **Hostinger hPanel**
2. Go to **Databases → MySQL Databases**
3. Create a new database (e.g. `u123456789_smartsuccess`)
4. Create a database user and set a strong password
5. Add the user to the database with **All Privileges**
6. Note down: Database name, Username, Password

---

## Step 2 — Upload Files

1. Go to **hPanel → Node.js**
2. Click **Create Application**
3. Set:
   - **Node.js version**: 18 or higher
   - **Application root**: `smart-success` (or any folder name)
   - **Application URL**: your domain or subdomain
   - **Application startup file**: `backend/server.js`
4. Click **Create**

Now upload the files:

1. Go to **File Manager** (or use FTP/SSH)
2. Navigate to the folder you set as Application Root
3. Upload ALL files from this package maintaining the folder structure

---

## Step 3 — Configure Environment

1. In File Manager, find `.env.example` and **copy it** to `.env`
2. Edit `.env` with your actual values:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_smartsuccess
DB_USER=u123456789_dbuser
DB_PASS=your_strong_password
JWT_SECRET=make-this-a-long-random-string-at-least-32-chars
```

> **Important:** Use your actual Hostinger MySQL credentials.
> The DB_HOST is `localhost` on Hostinger shared hosting.

---

## Step 4 — Install Dependencies

In Hostinger hPanel → Node.js → your app → click **Open Terminal** (or use SSH):

```bash
cd ~/smart-success    # your application root
npm install
```

---

## Step 5 — Set Up Database

Still in the terminal:

```bash
node backend/setup.js
```

You should see:
```
[Setup] Connected to MySQL
[Setup] Tables created
[Setup] Created user: Shahzaib
[Setup] Created user: Riyad
... etc
[Setup] Done! Database is ready.
```

---

## Step 6 — Start the App

In hPanel → Node.js → your app → click **Restart** (or **Start**)

The app will be live at your configured URL.

---

## Default Login PINs

| Name      | PIN  | Role                | Access       |
|-----------|------|---------------------|--------------|
| Shahzaib  | 1234 | Senior IT Engineer  | Admin        |
| Riyad     | 2345 | General Manager     | All + Approver |
| Azzam     | 3456 | Shop Operations     | All apps     |
| Hussam    | 4567 | Field Technician    | All apps     |
| Shahdat   | 5678 | Sales Representative| All apps     |

**Change all PINs immediately after first login** via Control Panel or My Profile.

---

## App Features

| App            | Who Can Access     | Notes                              |
|----------------|--------------------|------------------------------------|
| Petty Cash     | All                | Cash out needs approval by Riyad   |
| Daily Report   | All                | Daily/weekly/monthly export        |
| Tasks          | All                | Only Shahzaib & Riyad can delete   |
| Roles          | All                | View team responsibilities         |
| My Profile     | All (self only)    | Edit name, change own PIN          |
| Control Panel  | Shahzaib only      | Users, access, categories, perms   |

---

## Troubleshooting

**App won't start:**
- Check `.env` file exists and has correct DB credentials
- Check Node.js version is 16+
- Check `npm install` completed without errors

**Database connection failed:**
- Verify DB_HOST is `localhost`
- Verify DB_NAME, DB_USER, DB_PASS match exactly what Hostinger shows
- Check the database user has full privileges on the database

**Login shows "Connection error":**
- App is running but frontend can't reach the API
- Check the Node.js app is started (green status in hPanel)
- Check PORT in .env matches what Hostinger assigned

**Reset everything:**
```bash
node backend/setup.js   # Safe to run again — skips existing users
```

---

## Security Notes

- Change `JWT_SECRET` in `.env` to a long random string
- Change all default PINs after first login
- The `.env` file must NOT be publicly accessible (it's in the app root, not public_html, so it's safe)
- All API endpoints require authentication except the login and user list endpoints
