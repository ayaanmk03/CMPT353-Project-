# Writeit — CMPT353 Project

A StackOverflow-style Q&A community platform with channels, threaded replies, voting, image uploads, and full admin controls.

# Installation and Run Steps

- Git clone the repository
    `git clone https://github.com/ayaanmk03/CMPT353-Project-`
- `cd CMPT353-Project-`
- `cp .env.example .env`
- `cd next-app`

- Make sure docker is running
- Build the containers
    `docker compose build`

- Start the project
    `docker-compose up -d`

- Open the app in the browser
    `http://localhost:3000`
   
- Stop the project
    `docker-compose down`

## Tech Stack

- **Framework:** Next.js 16 (App Router) — React frontend + API routes in one
- **Database:** MySQL 8.0 (via `mysql2/promise`)
- **Auth:** JWT stored in `httpOnly` cookies, passwords hashed with `bcryptjs`
- **Images:** Uploaded via `multipart/form-data`, stored in `/uploads` volume, served at `/uploads/[filename]`

## Running with Docker

```bash
git clone <https://github.com/ayaanmk03/CMPT353-Project->
cp .env.example .env
cd next-app
docker-compose up --build
```

App available at **http://localhost:3000**

## Default Ports

| Service | Port |
|---|---|
| Web App | `3000` |
| MySQL | `3306` |

## Pre-seeded Login Credentials

The database seeds from `data/db.json` automatically on first boot.

> Create your own admin: Click **Join free** → check **Register as Administrator**.

EXAMPLE:

| Username | Password      | Role  |
|--------- | ------------- | ----- |
| `admin`  | `password123` | admin |


## Features by Requirement

### Part 1 — Basic System
- View and create channels (sidebar)
- Enter a channel to see posts sorted by score
- Create posts with optional image upload
- Reply to posts
- Everything persists in MySQL

### Part 2 — Accounts + Admin
- Register / Sign in / Sign out
- Only logged-in users can create posts or replies
- Passwords stored as bcrypt hashes
- Username shown on all posts and replies
- Admin panel (`Panel` button): delete users, channels, posts, replies

### Part 3 — Threaded Replies + Voting
- Reddit-style nested reply threads (infinite depth)
- One vote per user per item (post or reply)
- Upvote, downvote, or click same arrow again to remove vote
- Score displayed on all posts and replies

### Part 4 — Search
The search bar supports 5 search modes (selectable via the `type` query param):
1. **Substring** — searches post titles, content, and reply content
2. **By Author** — find all posts by a username
3. **Highest Ranked** — top voted posts
4. **Most Active User** — user with most posts
5. **Least Active User** — user with fewest posts
All results support **pagination** via `?page=N`.

## Database Schema

| Table | Key Columns |
|---|---|
| `users` | `id`, `username`, `password_hash`, `role`, `created_at` |
| `channels` | `id`, `name`, `description`, `created_by` |
| `posts` | `id`, `channel_id`, `user_id`, `title`, `content`, `image_url` |
| `replies` | `id`, `post_id`, `parent_reply_id`, `user_id`, `content`, `image_url` |
| `votes` | `id`, `user_id`, `item_type`, `item_id`, `vote_value` — UNIQUE per user+item |
| `attachments` | `id`, `item_type`, `item_id`, `filename`, `url`, `uploaded_by` |

Schema auto-migrates via `lib/db.js` on startup.

## Security

- Passwords hashed with bcrypt (cost 10)
- Sessions via JWT in `httpOnly` + `SameSite=strict` cookies (CSRF protection)
- Image uploads: PNG/JPG/WEBP only, max 5MB, sanitized filenames
- All admin routes require `role = 'admin'` server-side check
- SQL queries use parameterized statements (no injection)

## Reset Database

To wipe data and re-seed from scratch:

```bash
docker-compose down -v
docker-compose up --build
```

## Environment Variables

See `.env.example` for all required variables. `docker-compose.yml` sets them automatically for local use.
