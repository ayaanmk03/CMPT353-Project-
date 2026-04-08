# Design Report — WriteIt Discussion Platform

---

## 1. System Architecture

### Overview

WriteIt uses an architecture which is built with Next.js, where a single server process handles the React frontend, the JSON REST API, and the image serving logic. This allowed me to safely avoid any CORS configuration issues.The browser connects with the Next.js server on HTTP on port 3000. The application connects to a MySQL database running in a separate Docker container on port 3306.

### Key Architectural Decisions

The project uses Next.js so that both the UI and API can be in the same codebase and server. I choose a REST API style because the system performs with CRUD operations. All API routes are handled through a single catch all route which makes it easier to manage. Authentication is implemented using HTTP cookies which contain JWT tokens.I used Docker and Docker Compose so that the system can be started with a single command.

---

## 2. Database Choice and Justification

### Choice: MySQL 8.0

I choose MySQL because it is a relational database and the application data is highly relational. Users can create posts inside channels and posts have replies. Both posts and replies can be voted up or down. I also used referential integrity so when i delete a channel it automatically removes its posts, replies and votes without requiring any extra instructions. The `mysql2` library has connection pooling to support concurrent requests. The official MySQL Docker image has healthcheck support, which i found to be useful for organising the container.

### Schema Summary

The database contains the following tables:

users — account information and roles
channels — discussion categories
posts — posts inside channels
replies — threaded replies
votes — both post and reply voting
attachments — metadata about uploaded files

## 3. API Endpoints Overview

All endpoints are served under the `/api/` through a single catch all route.

### Authentication Endpoints

Users can register, log in, log out, and check their current session. Session lasts for seven days.

| Method | Endpoint        | Auth | Description                                 |
|--------|-----------------|------|---------------------------------------------|
| `POST` | `/api/register` | No   | Create a new user account                   |
| `POST` | `/api/login`    | No   | Validate credentials and set session cookie |
| `POST` | `/api/logout`   | No   | Clear the session cookie                    |
| `GET`  | `/api/me`       | No   | Return the currently authenticated user     |

### Channel Endpoints

Users can view all channels. Admins can delete channels with all its contents.

| Method    | Endpoint            | Auth     | Description                                        |
|-----------|---------------------|----------|----------------------------------------------------|
| `GET`     | `/api/channels`     | No       | List all channels                                  |
| `DELETE`  | `/api/channels/:id` | Admin    | Delete a channel and all its content               |

### Post Endpoints

Users can view posts within a channel, create new posts with images. Admins can delete posts.

| Method    | Endpoint                  | Auth           | Description                                        |
|-----------|---------------------------|----------------|----------------------------------------------------|
| `GET`     | `/api/channels/:id/posts` | No             | List posts in a channel ranked by score            |
| `POST`    | `/api/channels/:id/posts` | User           | Create a new post with optional image              |
| `GET`     | `/api/posts/:id`          | No             | Get a single post                                  |
| `DELETE`  | `/api/posts/:id`          | Admin          | Delete a post and its replies                      |

### Reply Endpoints

Users can view replies for a post and make new replies. Admins can delete replies.

| Method    | Endpoint                  | Auth           | Description                                        |
|-----------|---------------------------|----------------|----------------------------------------------------|
| `GET`     | `/api/posts/:id/replies`  | No             | List all replies for a post                        |
| `POST`    | `/api/posts/:id/replies`  | User           | Create a reply with image                          |
| `DELETE`  | `/api/replies/:id`        | Admin          | Delete a reply                                     |

### Voting Endpoint

Users can upvote or downvote posts and replies. Sending the same vote again toggles the vote off.(makes it back to the previous number) 

| Method    | Endpoint      | Auth  | Description                              |
|-----------|---------------|-------|------------------------------------------|
| `POST`    | `/api/vote`   | User  | Cast or toggle a vote on a post or reply |

### Administration Endpoints

Administrators can list all users and delete user accounts.

| Method    | Endpoint         | Auth  | Description               |
|-----------|------------------|-------|---------------------------|
| `GET`     | `/api/users`     | Admin | List all registered users |
| `DELETE`  | `/api/users/:id` | Admin | Delete a user account     |

### Search Endpoint

The search bar can be used to find any channels, posts or replies

| Method    | Endpoint                     | Auth | Description                       |
|-----------|------------------------------|------|-----------------------------------|
| `GET`     | `/api/search?q=&type=&page=` | No   | Find Channels, Posts or Replies   |

**Search modes (`type` parameter):**

| Value            | Behaviour                                                     |
|------------------|---------------------------------------------------------------|
| `substring`      | Matches query against post titles, content, and reply content |
| `author`         | Returns posts by users whose username matches the query       |
| `highest_ranked` | Returns all posts ordered by net vote score                   |
| `top_user`       | Returns the user with the most posts                          |
| `bottom_user`    | Returns the user with the fewest posts                        |

## 4. Screenshot and Image Storage Approach

### Strategy: Filesystem Storage

Images are saved to a Docker folder called `uploads` and are not stored in the database.

When the user uploads an image, the server validates the image MIME type, file extension and file size (max 5 MB). The file is written to disk, and its path is stored in the database.

When the browser requests an image, a route handler validates the filename to prevent path traversal, verifies the extension and reads the file from disk and then returns it with the correct MIME type.

I choose filesystem storage because it keeps the database small and backups faster. The Docker bind mount ensures images persist even if the container is rebuilt

## 5. Key Packages and Justification

### Production Packages

| Package               | Role                                                           |
|-----------------------|----------------------------------------------------------------|
| `next`                | Full-stack framework for both frontend and backend             |
| `react` / `react-dom` | Component-based user interface                                 |
| `mysql2`              | MySQL client with promise support and connection pooling       |
| `bcryptjs`            | Secure password hashing without native dependencies            |
| `jsonwebtoken`        | Stateless authentication tokens stored in HTTP-only cookies    |
| `lru-cache`           | In-memory caching for frequently requested data                |

### Development Packages

| Package                         | Role                                                           |
|---------------------------------|----------------------------------------------------------------|
| `tailwindcss`                   | Utility-first CSS framework for rapid and consistent styling   |
| `eslint` / `eslint-config-next` | Enforces coding best practices for React and Next.js           |

## 6. Container and Deployment Architecture

The system runs using Docker Compose with two services, application container and database container.

The database container runs MySQL with a persistent volume to store data. Healthcheck makes sure that MySQL is working
before the application starts. The application container builds the Next.js project, runs the server and mounts two 
volumes, one for uploaded images and another one for the seed data file. Environment variables are provided mentioned in the 
.env file.
