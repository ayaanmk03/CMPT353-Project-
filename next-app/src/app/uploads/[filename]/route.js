import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const UPLOADS_DIR = process.env.UPLOADS_DIR
    || path.join(process.cwd(), '..', 'uploads');

// Image types
const MIME_MAP = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
};

export async function GET(request, { params }) {
    const { filename } = await params;

    // Security: prevent path traversal
    if (!filename || filename.includes('/') || filename.includes('..')) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    // Validate file extensions
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext];
    if (!contentType) {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Check if file exists
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = readFileSync(filePath);
    return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}
