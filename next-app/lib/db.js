const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'writeituser',
    password: process.env.DB_PASSWORD || 'writeitpassword',
    database: process.env.DB_NAME || 'writeit',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    try {
        // TABLE FOR USERS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // TABLE FOR CHANNELS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS channels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                created_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // TABLE FOR POSTS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                channel_id INT NOT NULL,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                image_url VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_post_title (title)
            )
        `);

        // TABLE FOR REPLIES
        await pool.query(`
            CREATE TABLE IF NOT EXISTS replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                parent_reply_id INT DEFAULT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                image_url VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_reply_id) REFERENCES replies(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_reply_content (content(255))
            )
        `);

        // TABLE FOR VOTES
        await pool.query(`
            CREATE TABLE IF NOT EXISTS votes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                item_type VARCHAR(50) NOT NULL,
                item_id INT NOT NULL,
                vote_value INT NOT NULL,
                UNIQUE KEY unique_vote (user_id, item_type, item_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // TABLE FOR ATTACHMENTS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_type VARCHAR(50) NOT NULL,
                item_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                url VARCHAR(255) NOT NULL,
                uploaded_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);


        // Seed data if empty
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM channels');
        if (rows[0].count === 0) {
            console.log('Database is empty, seeding from db.json...');
            const dbPath = path.join(process.env.DB_DIR || path.join(process.cwd(), '../data'), 'db.json');
            if (fs.existsSync(dbPath)) {
                const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                
                for (let u of data.users) {
                    await pool.query('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)', 
                        [u.id, u.username, u.password_hash, u.role, new Date(u.created_at)]);
                }
                for (let c of data.channels) {
                    await pool.query('INSERT INTO channels (id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)', 
                        [c.id, c.name, c.description, c.created_by, new Date(c.created_at)]);
                }
                for (let p of data.posts) {
                    await pool.query('INSERT INTO posts (id, channel_id, user_id, title, content, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                        [p.id, p.channel_id, p.user_id, p.title, p.content, p.image_url, new Date(p.created_at)]);
                }
                for (let r of data.replies) {
                    await pool.query('INSERT INTO replies (id, post_id, parent_reply_id, user_id, content, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                        [r.id, r.post_id, r.parent_reply_id, r.user_id, r.content, r.image_url, new Date(r.created_at)]);
                }
                for (let v of data.votes) {
                    await pool.query('INSERT IGNORE INTO votes (id, user_id, item_type, item_id, vote_value) VALUES (?, ?, ?, ?, ?)', 
                        [v.id, v.user_id, v.item_type, v.item_id, v.vote_value]);
                }
                console.log('Seeding completed.');
            }
        }
    } catch (error) {
        console.error('Failed to initialize database schemas.', error);
    }
}

// Initialize database (will run once only.)
let dbInitialized = false;
async function kickoff() {
    if(dbInitialized) return;
    dbInitialized = true;
    await initDB();
}
kickoff();

module.exports = {
    pool,
    initDB
};
