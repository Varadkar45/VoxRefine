/**
 * AI Transcript Backend Server
 * Express.js server for audio transcription
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config, checkOllamaConnection, getAvailableModels } from './config/ollama.js';
import { checkWhisperConnection } from './services/whisperService.js';
import transcribeRouter from './routes/transcribe.js';
import historyRouter from './routes/history.js';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const [ollamaConnected, whisperReady] = await Promise.all([
    checkOllamaConnection(),
    checkWhisperConnection()
  ]);

  res.json({
    status: 'ok',
    services: {
      whisper: {
        status: whisperReady ? 'ready' : 'not ready',
        model: process.env.WHISPER_MODEL_SIZE || 'large-v3'
      },
      ollama: {
        status: ollamaConnected ? 'connected' : 'disconnected',
        url: config.baseUrl,
        model: config.llmModel
      }
    }
  });
});

// Service status endpoint
app.get('/api/status', async (req, res) => {
  const [ollamaConnected, whisperReady] = await Promise.all([
    checkOllamaConnection(),
    checkWhisperConnection()
  ]);

  const errors = [];

  if (!whisperReady) {
    errors.push({
      service: 'whisper',
      message: 'Python environment not found',
      hint: 'Run: cd whisper-service && python -m venv venv && venv\\Scripts\\pip install -r requirements.txt'
    });
  }

  if (!ollamaConnected) {
    errors.push({
      service: 'ollama',
      message: `Ollama not reachable at ${config.baseUrl}`,
      hint: 'Start Ollama: ollama serve'
    });
  }

  const ready = whisperReady && ollamaConnected;

  res.status(ready ? 200 : 503).json({
    ready,
    whisper: whisperReady,
    ollama: ollamaConnected,
    errors: errors.length > 0 ? errors : undefined
  });
});

// Model status endpoint
app.get('/api/models', async (req, res) => {
  const ollamaConnected = await checkOllamaConnection();

  if (!ollamaConnected) {
    return res.status(503).json({
      error: `Ollama is not reachable at ${config.baseUrl}`,
      hint: 'Make sure Ollama is running with: ollama serve'
    });
  }

  const availableModels = await getAvailableModels();

  res.json({
    required: {
      llm: config.llmModel
    },
    available: availableModels,
    llmReady: availableModels.some(m =>
      m === config.llmModel || m.startsWith(`${config.llmModel}:`)
    )
  });
});

// API routes
app.use('/api/transcribe', transcribeRouter);
app.use('/api/history', historyRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/status',
      'GET /api/models',
      'POST /api/transcribe'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
async function startServer() {
  console.log('Checking services...');

  // Check Whisper (Python) availability
  const whisperReady = await checkWhisperConnection();
  if (whisperReady) {
    console.log(`Whisper Python environment ready (model: ${process.env.WHISPER_MODEL_SIZE || 'large-v3'})`);
  } else {
    console.warn('Warning: Whisper Python environment not found');
    console.warn('Run: cd whisper-service && python -m venv venv && pip install -r requirements.txt');
  }

  // Check Ollama connection
  const ollamaConnected = await checkOllamaConnection();
  if (ollamaConnected) {
    console.log(`Ollama connected at ${config.baseUrl}`);
    const models = await getAvailableModels();
    console.log(`Available models: ${models.join(', ') || 'none'}`);
  } else {
    console.warn(`Warning: Ollama is not reachable at ${config.baseUrl}`);
    console.warn('Make sure Ollama is running with: ollama serve');
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('AI Transcript Backend');
    console.log('='.repeat(50));
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('Configuration:');
    console.log(`  Whisper Model: ${process.env.WHISPER_MODEL_SIZE || 'large-v3'}`);
    console.log(`  Ollama URL: ${config.baseUrl}`);
    console.log(`  LLM Model: ${config.llmModel}`);
    console.log('='.repeat(50));
  });
}

startServer();
