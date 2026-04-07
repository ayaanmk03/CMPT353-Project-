import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { writeFile } from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-grading';

// Resolve uploads dir
const UPLOADS_DIR = process.env.UPLOADS_DIR
    || path.join(process.cwd(), '..', 'uploads');

async function authenticate(request) {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await db.pool.query('SELECT id, username, role FROM users WHERE id = ?', [decoded.userId]);
        if (rows.length > 0) return rows[0];
    } catch (e) {}
    return null;
}

/** Save an uploaded file object to disk and return the public URL path */
async function saveUploadedFile(file) {
    if (!file || file.size === 0) return null;

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.name).toLowerCase();

    if (!allowedMimes.includes(file.type) || !allowedExts.includes(ext)) {
        throw new Error('Only PNG, JPEG, and WEBP images are allowed');
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be under 5MB');
    }

    if (!existsSync(UPLOADS_DIR)) {
        mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const bytes = await file.arrayBuffer();
    await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(bytes));
    return `/uploads/${filename}`;
}

// GET 

export async function GET(request, { params }) {
    await db.initDB();
    const slug = (await params)?.slug ?? [];
    const slugStr = slug.join('/');
    const user = await authenticate(request);
    const { searchParams } = new URL(request.url);

    try {
        // GET /api/me
        if (slugStr === 'me') {
            return NextResponse.json({ user });
        }

        // GET /api/users
        if (slugStr === 'users') {
            if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            const [rows] = await db.pool.query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
            return NextResponse.json(rows);
        }

        // GET /api/channels
        if (slugStr === 'channels') {
            const [rows] = await db.pool.query('SELECT * FROM channels ORDER BY created_at ASC');
            return NextResponse.json(rows);
        }

        // GET /api/channels/:id/posts
        if (/^channels\/\d+\/posts$/.test(slugStr)) {
            const channelId = slug[1];
            const [rows] = await db.pool.query(`
                SELECT p.*, u.username,
                    COALESCE(SUM(v.vote_value), 0) AS score
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN votes v ON v.item_id = p.id AND v.item_type = 'post'
                WHERE p.channel_id = ?
                GROUP BY p.id
                ORDER BY score DESC, p.created_at DESC
            `, [channelId]);
            return NextResponse.json(rows);
        }

        // GET /api/posts/:id/replies
        if (/^posts\/\d+\/replies$/.test(slugStr)) {
            const postId = slug[1];
            const [rows] = await db.pool.query(`
                SELECT r.*, u.username,
                    COALESCE(SUM(v.vote_value), 0) AS score
                FROM replies r
                JOIN users u ON r.user_id = u.id
                LEFT JOIN votes v ON v.item_id = r.id AND v.item_type = 'reply'
                WHERE r.post_id = ?
                GROUP BY r.id
                ORDER BY score DESC, r.created_at ASC
            `, [postId]);
            return NextResponse.json(rows);
        }

        // GET /api/posts/:id
        if (/^posts\/\d+$/.test(slugStr)) {
            const postId = slug[1];
            const [rows] = await db.pool.query(`
                SELECT p.*, u.username, c.id as channel_id,
                    COALESCE(SUM(v.vote_value), 0) AS score
                FROM posts p
                JOIN users u ON p.user_id = u.id
                JOIN channels c ON p.channel_id = c.id
                LEFT JOIN votes v ON v.item_id = p.id AND v.item_type = 'post'
                WHERE p.id = ?
                GROUP BY p.id
            `, [postId]);
            if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            return NextResponse.json(rows[0]);
        }

        // GET /api/search with type and page
        if (slugStr === 'search') {
            const q = searchParams.get('q') || '';
            const type = searchParams.get('type') || 'substring';
            const pageNum = parseInt(searchParams.get('page') || '1');
            const limit = 10;
            const offset = (pageNum - 1) * limit;

            if (type === 'top_user' || type === 'bottom_user') {
                const order = type === 'top_user' ? 'DESC' : 'ASC';
                const label = type === 'top_user' ? 'Post Count' : 'Post Count';
                const [users] = await db.pool.query(`
                    SELECT u.id, u.username, COUNT(p.id) as post_count, ? as metric_label, COUNT(p.id) as metric_value
                    FROM users u
                    LEFT JOIN posts p ON u.id = p.user_id
                    GROUP BY u.id
                    ORDER BY post_count ${order}
                    LIMIT 1
                `, [label]);
                return NextResponse.json({ type: 'user_stats', users, posts: [], replies: [] });
            }

            if (type === 'highest_ranked') {
                const [posts] = await db.pool.query(`
                    SELECT p.*, u.username, COALESCE(SUM(v.vote_value), 0) AS score
                    FROM posts p
                    JOIN users u ON p.user_id = u.id
                    LEFT JOIN votes v ON v.item_id = p.id AND v.item_type = 'post'
                    GROUP BY p.id
                    ORDER BY score DESC
                    LIMIT ? OFFSET ?
                `, [limit, offset]);
                return NextResponse.json({ type: 'posts', posts, replies: [] });
            }

            if (type === 'author') {
                if (!q) return NextResponse.json({ type: 'posts', posts: [], replies: [] });
                const [posts] = await db.pool.query(`
                    SELECT p.*, u.username, COALESCE(SUM(v.vote_value), 0) AS score
                    FROM posts p
                    JOIN users u ON p.user_id = u.id
                    LEFT JOIN votes v ON v.item_id = p.id AND v.item_type = 'post'
                    WHERE u.username LIKE ?
                    GROUP BY p.id
                    ORDER BY p.created_at DESC
                    LIMIT ? OFFSET ?
                `, [`%${q}%`, limit, offset]);
                return NextResponse.json({ type: 'posts', posts, replies: [] });
            }

            // substring
            if (!q) return NextResponse.json({ type: 'posts', posts: [], replies: [] });
            const like = `%${q}%`;
            const [posts] = await db.pool.query(`
                SELECT p.*, u.username
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.title LIKE ? OR p.content LIKE ?
                LIMIT ? OFFSET ?
            `, [like, like, limit, offset]);
            const [replies] = await db.pool.query(`
                SELECT r.*, u.username, p.title AS post_title
                FROM replies r
                JOIN users u ON r.user_id = u.id
                JOIN posts p ON r.post_id = p.id
                WHERE r.content LIKE ?
                LIMIT ? OFFSET ?
            `, [like, limit, offset]);
            return NextResponse.json({ type: 'posts', posts, replies });
        }

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Route not found: ' + slugStr }, { status: 404 });
}

// POST 

export async function POST(request, { params }) {
    await db.initDB();
    const slug = (await params)?.slug ?? [];
    const slugStr = slug.join('/');
    const user = await authenticate(request);

    try {
        // POST /api/register
        if (slugStr === 'register') {
            const { username, password, isAdmin } = await request.json();
            if (!username || !password) return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
            const [existing] = await db.pool.query('SELECT id FROM users WHERE username = ?', [username]);
            if (existing.length > 0) return NextResponse.json({ error: 'Username taken' }, { status: 400 });
            const hash = bcrypt.hashSync(password, 10);
            const role = isAdmin ? 'admin' : 'user';
            const [result] = await db.pool.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, role]);
            return NextResponse.json({ success: true, userId: result.insertId }, { status: 201 });
        }

        // POST /api/login
        if (slugStr === 'login') {
            const { username, password } = await request.json();
            const [rows] = await db.pool.query('SELECT * FROM users WHERE username = ?', [username]);
            const dbUser = rows[0];
            if (!dbUser || !bcrypt.compareSync(password, dbUser.password_hash)) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
            const token = jwt.sign({ userId: dbUser.id }, JWT_SECRET, { expiresIn: '7d' });
            const res = NextResponse.json({ success: true, user: { id: dbUser.id, username: dbUser.username, role: dbUser.role } });
            res.cookies.set('token', token, { httpOnly: true, sameSite: 'strict', path: '/' });
            return res;
        }

        // POST /api/logout
        if (slugStr === 'logout') {
            const res = NextResponse.json({ success: true });
            res.cookies.delete('token');
            return res;
        }

        // All routes below need the auth
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // POST /api/channels
        if (slugStr === 'channels') {
            const { name, description } = await request.json();
            const [existing] = await db.pool.query('SELECT id FROM channels WHERE name = ?', [name]);
            if (existing.length > 0) return NextResponse.json({ error: 'Channel name taken' }, { status: 400 });
            const [result] = await db.pool.query('INSERT INTO channels (name, description, created_by) VALUES (?, ?, ?)', [name, description, user.id]);
            return NextResponse.json({ id: result.insertId, success: true }, { status: 201 });
        }

        // POST /api/channels/:id/posts  
        if (/^channels\/\d+\/posts$/.test(slugStr)) {
            const channelId = slug[1];
            const formData = await request.formData();
            const title = formData.get('title');
            const content = formData.get('content');
            const imageFile = formData.get('image');
            const imageUrl = await saveUploadedFile(imageFile instanceof File ? imageFile : null);
            const [result] = await db.pool.query(
                'INSERT INTO posts (channel_id, user_id, title, content, image_url) VALUES (?, ?, ?, ?, ?)',
                [channelId, user.id, title, content, imageUrl]
            );
            return NextResponse.json({ id: result.insertId, success: true }, { status: 201 });
        }

        // POST /api/posts/:id/replies  
        if (/^posts\/\d+\/replies$/.test(slugStr)) {
            const postId = slug[1];
            const formData = await request.formData();
            const content = formData.get('content');
            const parent_reply_id = formData.get('parent_reply_id');
            const imageFile = formData.get('image');
            const imageUrl = await saveUploadedFile(imageFile instanceof File ? imageFile : null);
            const parentId = parent_reply_id ? parseInt(parent_reply_id) : null;
            const [result] = await db.pool.query(
                'INSERT INTO replies (post_id, parent_reply_id, user_id, content, image_url) VALUES (?, ?, ?, ?, ?)',
                [postId, parentId, user.id, content, imageUrl]
            );
            return NextResponse.json({ id: result.insertId, success: true }, { status: 201 });
        }

        // POST /api/vote
        if (slugStr === 'vote') {
            const { item_type, item_id, vote_value } = await request.json();
            if (!['post', 'reply'].includes(item_type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
            const parsedItemId = parseInt(item_id);
            const parsedVoteValue = parseInt(vote_value);
            const [existing] = await db.pool.query(
                'SELECT vote_value FROM votes WHERE user_id = ? AND item_type = ? AND item_id = ?',
                [user.id, item_type, parsedItemId]
            );
            await db.pool.query('DELETE FROM votes WHERE user_id = ? AND item_type = ? AND item_id = ?',
                [user.id, item_type, parsedItemId]);
            const isToggleOff = existing.length > 0 && existing[0].vote_value === parsedVoteValue;
            if (parsedVoteValue !== 0 && !isToggleOff) {
                await db.pool.query(
                    'INSERT INTO votes (user_id, item_type, item_id, vote_value) VALUES (?, ?, ?, ?)',
                    [user.id, item_type, parsedItemId, parsedVoteValue]
                );
            }
            return NextResponse.json({ success: true, toggledOff: isToggleOff });
        }

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Route not found: ' + slugStr }, { status: 404 });
}

// DELETE 

export async function DELETE(request, { params }) {
    await db.initDB();
    const slug = (await params)?.slug ?? [];
    const slugStr = slug.join('/');
    const user = await authenticate(request);

    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // DELETE /api/channels/:id
        if (/^channels\/\d+$/.test(slugStr)) {
            await db.pool.query('DELETE FROM channels WHERE id = ?', [slug[1]]);
            return NextResponse.json({ success: true });
        }

        // DELETE /api/posts/:id
        if (/^posts\/\d+$/.test(slugStr)) {
            await db.pool.query('DELETE FROM posts WHERE id = ?', [slug[1]]);
            return NextResponse.json({ success: true });
        }

        // DELETE /api/replies/:id
        if (/^replies\/\d+$/.test(slugStr)) {
            await db.pool.query('DELETE FROM replies WHERE id = ?', [slug[1]]);
            return NextResponse.json({ success: true });
        }

        // DELETE /api/users/:id
        if (/^users\/\d+$/.test(slugStr)) {
            await db.pool.query('DELETE FROM users WHERE id = ?', [slug[1]]);
            return NextResponse.json({ success: true });
        }

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Route not found: ' + slugStr }, { status: 404 });
}
