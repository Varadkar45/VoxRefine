/**
 * Transcribe Route
 * Handles audio file upload and transcription requests
 */

import { Router } from 'express';
import multer from 'multer';
import { join, extname } from 'path';
import { unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { transcribeAudio, isValidAudioFormat } from '../services/whisperService.js';
import { cleanTranscript } from '../services/llmService.js';
import { saveTranscript } from '../services/dbService.js';

const router = Router();

// Configure upload directory
const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024  // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (isValidAudioFormat(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Supported: webm, wav, mp3, mp4, m4a, ogg, flac'));
    }
  }
});

/**
 * POST /api/transcribe
 * Upload and transcribe an audio file
 */
router.post('/', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided. Please upload an audio file with field name "audio".'
      });
    }

    filePath = req.file.path;
    console.log(`Processing audio file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Step 1: Transcribe audio using Whisper
    console.log('Starting transcription with Whisper...');
    const rawTranscript = await transcribeAudio(filePath);
    console.log(`Transcription complete: ${rawTranscript.length} characters`);

    // Step 2: Clean transcript using LLM
    console.log('Cleaning transcript with LLM...');
    const cleanedTranscript = await cleanTranscript(rawTranscript);
    console.log(`Cleaning complete: ${cleanedTranscript.length} characters`);

    const id = saveTranscript(rawTranscript, cleanedTranscript);

    // Return both transcripts
    res.json({
      id,
      raw_transcript: rawTranscript,
      cleaned_transcript: cleanedTranscript
    });

  } catch (error) {
    console.error('Transcription error:', error.message);

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('not reachable')) {
      statusCode = 503;  // Service Unavailable
    } else if (error.message.includes('not available')) {
      statusCode = 503;
    } else if (error.message.includes('Invalid audio')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: error.message
    });

  } finally {
    // Clean up uploaded file
    if (filePath) {
      try {
        await unlink(filePath);
        console.log('Cleaned up temporary file');
      } catch (cleanupError) {
        console.warn('Failed to clean up file:', cleanupError.message);
      }
    }
  }
});

/**
 * Handle multer errors
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 100MB.'
      });
    }
    return res.status(400).json({
      error: `Upload error: ${error.message}`
    });
  }

  if (error.message.includes('Invalid audio format')) {
    return res.status(400).json({
      error: error.message
    });
  }

  next(error);
});

export default router;
