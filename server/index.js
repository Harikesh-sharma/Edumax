import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Edumax';

// Initial connection promise for sharing
const clientPromise = mongoose.connect(mongoURI);

clientPromise
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const conn = mongoose.connection;

let gridfsBucket;
conn.once('open', () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
    console.log('📦 GridFS System Ready');
});

// Use memory storage for stability; we manually stream to GridFS
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// PDF Schema for Metadata
const pdfSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: String,
    price: { type: Number, default: 0 },
    category: { type: String, required: true },
    description: String,
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fileName: String,
    createdAt: { type: Date, default: Date.now },
    locked: { type: Boolean, default: true }
});

const Pdf = mongoose.model('Pdf', pdfSchema);

// Routes
// @route POST /api/pdfs
app.post('/api/pdfs', upload.single('file'), async (req, res) => {
    console.log('⚡ Received upload request');

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!gridfsBucket) {
            return res.status(503).json({ error: 'Database/GridFS not ready' });
        }

        const { title, author, price, category, description } = req.body;

        // 1. Manually upload file to GridFS
        const filename = `${crypto.randomBytes(16).toString('hex')}${path.extname(req.file.originalname)}`;
        const uploadStream = gridfsBucket.openUploadStream(filename, {
            contentType: req.file.mimetype
        });

        const fileId = uploadStream.id;

        // Stream management
        await new Promise((resolve, reject) => {
            uploadStream.end(req.file.buffer);
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
        });

        console.log(`📤 File uploaded to GridFS: ${fileId}`);

        // 2. Save metadata
        const newPdf = new Pdf({
            title,
            author: author || 'Unknown',
            price: Number(price) || 0,
            category,
            description,
            fileId: fileId,
            fileName: req.file.originalname,
            locked: (Number(price) || 0) > 0
        });

        const savedPdf = await newPdf.save();
        console.log(`✅ PDF Metadata saved: ${savedPdf.title}`);
        res.status(201).json(savedPdf);

    } catch (err) {
        console.error('❌ Upload Workflow Failure:', err);
        res.status(500).json({
            error: 'Failed to process PDF upload',
            details: err.message
        });
    }
});

// @route GET /api/pdfs
// @desc  Fetch all PDF metadata
app.get('/api/pdfs', async (req, res) => {
    try {
        const pdfs = await Pdf.find().sort({ createdAt: -1 });
        res.json(pdfs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch PDFs' });
    }
});

// @route GET /api/pdfs/file/:id
// @desc  Stream PDF file
app.get('/api/pdfs/file/:id', async (req, res) => {
    try {
        if (!gridfsBucket) {
            return res.status(503).json({ error: 'Stream engine not ready' });
        }

        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const downloadStream = gridfsBucket.openDownloadStream(fileId);

        downloadStream.on('error', (err) => {
            res.status(404).json({ error: 'Document content not found' });
        });

        res.set('Content-Type', 'application/pdf');
        downloadStream.pipe(res);
    } catch (err) {
        res.status(500).json({ error: 'Invalid document ID' });
    }
});

// @route DELETE /api/pdfs/:id
// @desc  Delete PDF metadata and file
app.delete('/api/pdfs/:id', async (req, res) => {
    try {
        const pdf = await Pdf.findById(req.params.id);
        if (!pdf) return res.status(404).json({ error: 'PDF not found' });

        if (gridfsBucket) {
            try {
                await gridfsBucket.delete(pdf.fileId);
            } catch (err) {
                console.warn('⚠️ File cleanup warning:', err.message);
            }
        }

        await Pdf.findByIdAndDelete(req.params.id);
        res.json({ message: 'PDF deleted successfully' });
    } catch (err) {
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
