import express from 'express';
import pg from 'pg';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// PostgreSQL Configuration (Neon)
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Neon/Heroku/Render
    }
});

pool.on('connect', () => {
    console.log('✅ Connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL Pool Error:', err);
});

// Create tables if they don't exist
const initDb = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS pdfs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT DEFAULT 'Unknown',
        price NUMERIC DEFAULT 0,
        category TEXT NOT NULL,
        description TEXT,
        cloudinary_id TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        locked BOOLEAN DEFAULT TRUE
      );
    `);
        console.log('📊 Database structure verified');
    } catch (err) {
        console.error('❌ Failed to initialize database:', err.message);
    }
};
initDb();

// Cloudinary Storage Engine for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'edumax_pdfs',
        format: async (req, file) => 'pdf', // force pdf
        public_id: (req, file) => `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
        resource_type: 'image',
        access_mode: 'public'
    },
});

const upload = multer({ storage: storage });

// Routes

// @route POST /api/pdfs
// @desc  Upload PDF to Cloudinary and save metadata to Neon
app.post('/api/pdfs', upload.single('file'), async (req, res) => {
    console.log('⚡ Received upload request');

    try {
        if (!req.file) {
            console.error('❌ No file received in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, author, price, category, description } = req.body;

        if (!title || !category) {
            console.error('❌ Missing required fields:', { title, category });
            return res.status(400).json({
                error: 'Title and Category are required',
                details: `Received: title="${title}", category="${category}"`
            });
        }

        const isLocked = (Number(price) || 0) > 0;

        const query = `
      INSERT INTO pdfs (title, author, price, category, description, cloudinary_id, file_url, file_name, locked)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            title,
            author || 'Unknown',
            Number(price) || 0,
            category,
            description,
            req.file.filename, // This is the public_id in Cloudinary
            req.file.path,     // This is the secure_url
            req.file.originalname,
            isLocked
        ];

        const result = await pool.query(query, values);
        const savedPdf = result.rows[0];

        console.log(`✅ PDF Metadata saved: ${savedPdf.title}`);

        // Map PostgreSQL snake_case to frontend expected camelCase if necessary
        // Frontend expects _id and fileId
        const responseData = {
            ...savedPdf,
            _id: savedPdf.id,
            fileId: savedPdf.id // Using database ID as fileId reference
        };

        res.status(201).json(responseData);

    } catch (err) {
        console.error('❌ Upload Workflow Failure:', err);
        // Ensure we always return JSON
        res.status(500).json({
            error: 'Server failed to process upload',
            details: err.message || 'Unknown error during file processing'
        });
    }
});

// @route GET /api/pdfs
// @desc  Fetch all PDF metadata from Neon
app.get('/api/pdfs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pdfs ORDER BY created_at DESC');
        // Map for frontend compatibility
        const pdfs = result.rows.map(pdf => ({
            ...pdf,
            _id: pdf.id,
            fileId: pdf.id
        }));
        res.json(pdfs);
    } catch (err) {
        console.error('❌ GET Failed:', err);
        res.status(500).json({ error: 'Failed to fetch PDFs' });
    }
});

// @route GET /api/pdfs/file/:id
// @desc  Get PDF file URL (Redirect to Cloudinary for simplicity, or proxy it)
app.get('/api/pdfs/file/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await pool.query('SELECT file_url FROM pdfs WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Direct redirect to Cloudinary URL
        // In a production app with paid content, you'd want to use signed URLs or stream the content
        res.redirect(result.rows[0].file_url);
    } catch (err) {
        console.error('❌ Stream engine error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// @route DELETE /api/pdfs/:id
// @desc  Delete PDF from Cloudinary and Neon
app.delete('/api/pdfs/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // 1. Get cloudinary info
        const result = await pool.query('SELECT cloudinary_id FROM pdfs WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'PDF not found' });
        }

        const cloudinaryId = result.rows[0].cloudinary_id;

        // 2. Delete from Cloudinary
        try {
            // For 'raw' files, we need to specify resource_type
            await cloudinary.uploader.destroy(cloudinaryId, { resource_type: 'raw' });
        } catch (cloudinaryErr) {
            console.warn('⚠️ Cloudinary cleanup warning:', cloudinaryErr.message);
        }

        // 3. Delete from Database
        await pool.query('DELETE FROM pdfs WHERE id = $1', [id]);

        res.json({ message: 'PDF deleted successfully' });
    } catch (err) {
        console.error('❌ Delete failed:', err);
        res.status(500).json({ error: 'Failed to delete PDF' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🔥 GLOBAL SERVER ERROR:', err);
    res.status(500).json({
        error: 'An internal server error occurred',
        details: err.message
    });
});

app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));
