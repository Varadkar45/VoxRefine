/**
 * Whisper Service
 * Handles speech-to-text transcription by calling Python faster-whisper
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to Python virtual environment and script
const WHISPER_VENV = process.env.WHISPER_VENV || join(__dirname, '..', '..', '..', 'whisper-service', 'venv');
const WHISPER_SCRIPT = process.env.WHISPER_SCRIPT || join(__dirname, '..', '..', '..', 'whisper-service', 'transcribe.py');
const WHISPER_TIMEOUT = parseInt(process.env.WHISPER_TIMEOUT || '300000', 10); // 5 minutes

// Python executable path (platform-specific)
const PYTHON_EXE = process.platform === 'win32'
  ? join(WHISPER_VENV, 'Scripts', 'python.exe')
  : join(WHISPER_VENV, 'bin', 'python');

/**
 * Transcribe audio file using Python faster-whisper
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioFilePath) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      WHISPER_MODEL_SIZE: process.env.WHISPER_MODEL_SIZE || 'large-v3',
      WHISPER_DEVICE: process.env.WHISPER_DEVICE || 'auto',
      WHISPER_COMPUTE_TYPE: process.env.WHISPER_COMPUTE_TYPE || 'auto'
    };

    const pythonProcess = spawn(PYTHON_EXE, [WHISPER_SCRIPT, audioFilePath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Timeout handling
    const timeout = setTimeout(() => {
      pythonProcess.kill('SIGTERM');
      reject(new Error(`Transcription timed out after ${WHISPER_TIMEOUT / 1000} seconds`));
    }, WHISPER_TIMEOUT);

    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        const errorMsg = stderr || `Python process exited with code ${code}`;
        reject(new Error(`Whisper transcription failed: ${errorMsg}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());

        if (result.error) {
          reject(new Error(result.error));
          return;
        }

        if (!result.text) {
          reject(new Error('Whisper returned empty transcription'));
          return;
        }

        console.log(`Transcription complete. Language: ${result.language} (${(result.language_probability * 100).toFixed(1)}%)`);
        resolve(result.text.trim());

      } catch (parseError) {
        reject(new Error(`Failed to parse Whisper output: ${stdout}`));
      }
    });

    pythonProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start Python process: ${error.message}. Make sure the virtual environment exists at ${WHISPER_VENV}`));
    });
  });
}

/**
 * Check if Whisper service (Python environment) is available
 * @returns {Promise<boolean>}
 */
async function checkWhisperConnection() {
  return new Promise((resolve) => {
    const pythonProcess = spawn(PYTHON_EXE, ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    pythonProcess.on('close', (code) => {
      resolve(code === 0);
    });

    pythonProcess.on('error', () => {
      resolve(false);
    });

    // Quick timeout for version check
    setTimeout(() => {
      pythonProcess.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Get MIME type from file extension
 * @param {string} filePath - Path to the file
 * @returns {string} - MIME type
 */
function getMimeType(filePath) {
  const extension = filePath.split('.').pop().toLowerCase();

  const mimeTypes = {
    'webm': 'audio/webm',
    'wav': 'audio/wav',
    'mp3': 'audio/mpeg',
    'mp4': 'audio/mp4',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac'
  };

  return mimeTypes[extension] || 'audio/webm';
}

/**
 * Validate that the audio file is in a supported format
 * @param {string} filename - Original filename
 * @returns {boolean}
 */
function isValidAudioFormat(filename) {
  const supportedFormats = ['webm', 'wav', 'mp3', 'mp4', 'm4a', 'ogg', 'flac'];
  const extension = filename.split('.').pop().toLowerCase();
  return supportedFormats.includes(extension);
}

export {
  transcribeAudio,
  isValidAudioFormat,
  getMimeType,
  checkWhisperConnection
};
