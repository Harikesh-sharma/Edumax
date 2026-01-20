import express from 'express';
import pg from 'pg';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cors from 'cors';
import dotenv from 'dotenv';
import serverless from 'serverless-http';

dotenv.config();

const app = express();

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
        rejectUnauthorized: false
    }
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
    } catch (err) {
        console.error('❌ Database Init Error:', err.message);
    }
};
// We call initDb on every cold start or provide a specific init endpoint
initDb();

// Cloudinary Storage Engine for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'edumax_pdfs',
        format: async (req, file) => 'pdf',
        public_id: (req, file) => `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
        resource_type: 'image',
        access_mode: 'public'
    },
});

const upload = multer({ storage: storage });

// Routes (using /api prefix or relative to the function mount point)
const router = express.Router();

router.post('/pdfs', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { title, author, price, category, description } = req.body;
        if (!title || !category) return res.status(400).json({ error: 'Title and Category are required' });

        const isLocked = (Number(price) || 0) > 0;

        const query = `
      INSERT INTO pdfs (title, author, price, category, description, cloudinary_id, file_url, file_name, locked)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            title, author || 'Unknown', Number(price) || 0, category, description,
            req.file.filename, req.file.path, req.file.originalname, isLocked
        ];

        const result = await pool.query(query, values);
        const savedPdf = result.rows[0];

        res.status(201).json({ ...savedPdf, _id: savedPdf.id, fileId: savedPdf.id });
    } catch (err) {
        console.error('❌ Upload Workflow Failure:', err);
        res.status(500).json({
            error: 'Failed to process PDF upload',
            details: err.message
        });
    }
});

router.get('/pdfs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pdfs ORDER BY created_at DESC');
        res.json(result.rows.map(pdf => ({ ...pdf, _id: pdf.id, fileId: pdf.id })));
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

router.get('/pdfs/file/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT file_url FROM pdfs WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.redirect(result.rows[0].file_url);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/pdfs/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT cloudinary_id FROM pdfs WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        try {
            await cloudinary.uploader.destroy(result.rows[0].cloudinary_id, { resource_type: 'raw' });
        } catch (e) { }

        await pool.query('DELETE FROM pdfs WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Mount router for both local dev and production Netlify paths
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router);

export const handler = serverless(app);
