# AI Transcript Backend

Express.js backend for audio transcription using Ollama-hosted AI models.

## Quick Start

```bash
npm install
cp .env.example .env
npm start
```

## API Endpoints

### POST /api/transcribe

Upload an audio file for transcription and cleaning.

**Request:**
```
Content-Type: multipart/form-data
Body: audio file
```

**Response:**
```json
{
  "raw_transcript": "Original transcription from Whisper",
  "cleaned_transcript": "Cleaned version from LLM"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "ollama": "connected"
}
```

## Configuration

See `.env.example` for available environment variables.

## Dependencies

- **express** - Web framework
- **multer** - File upload handling
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management
