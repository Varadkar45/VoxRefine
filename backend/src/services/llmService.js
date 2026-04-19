/**
 * LLM Service
 * Handles transcript cleaning using gpt-oss:20b via Ollama's OpenAI-compatible API
 */

import { config, checkOllamaConnection, isModelAvailable } from '../config/ollama.js';

// System prompt for transcript cleaning
const CLEANING_SYSTEM_PROMPT = `You are a professional transcript editor. Your task is to clean up raw speech transcriptions while preserving their original meaning.

Rules:
1. Remove filler words (um, uh, like, you know, basically, actually, literally, etc.)
2. Fix grammatical errors
3. Remove false starts and repeated words
4. Maintain the speaker's original intent and tone
5. Keep technical terms and proper nouns intact
6. Do not add information that wasn't in the original
7. Do not summarize - keep the full content
8. Return ONLY the cleaned transcript, no explanations

Output the cleaned transcript directly without any preamble.`;

/**
 * Clean a transcript using the LLM
 * @param {string} rawTranscript - The raw transcript to clean
 * @returns {Promise<string>} - Cleaned transcript
 */
async function cleanTranscript(rawTranscript) {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return rawTranscript;
  }

  try {
    // Verify Ollama connection
    const isConnected = await checkOllamaConnection();
    if (!isConnected) {
      console.warn('Ollama not reachable for LLM cleaning, returning raw transcript');
      return rawTranscript;
    }

    // Verify model availability
    const modelAvailable = await isModelAvailable(config.llmModel);
    if (!modelAvailable) {
      console.warn(`LLM model '${config.llmModel}' not available, returning raw transcript`);
      return rawTranscript;
    }

    // Use OpenAI-compatible endpoint
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.llmModel,
        messages: [
          {
            role: 'system',
            content: CLEANING_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Please clean the following transcript:\n\n${rawTranscript}`
          }
        ],
        temperature: 0.3,  // Low temperature for consistent output
        max_tokens: 4096,
        stream: false
      }),
      signal: AbortSignal.timeout(config.timeouts.llm)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM cleaning failed: ${errorText}`);
      return rawTranscript;  // Fallback to raw transcript
    }

    const result = await response.json();

    // Extract the cleaned transcript from the response
    const cleanedText = result.choices?.[0]?.message?.content;

    if (!cleanedText || cleanedText.trim().length === 0) {
      console.warn('LLM returned empty response, returning raw transcript');
      return rawTranscript;
    }

    return cleanedText.trim();

  } catch (error) {
    console.error('Error during transcript cleaning:', error.message);
    // Fallback to raw transcript on any error
    return rawTranscript;
  }
}

/**
 * Check if LLM service is available
 * @returns {Promise<{available: boolean, reason?: string}>}
 */
async function checkLLMAvailability() {
  const isConnected = await checkOllamaConnection();
  if (!isConnected) {
    return {
      available: false,
      reason: `Ollama not reachable at ${config.baseUrl}`
    };
  }

  const modelAvailable = await isModelAvailable(config.llmModel);
  if (!modelAvailable) {
    return {
      available: false,
      reason: `Model '${config.llmModel}' not found. Pull it with: ollama pull ${config.llmModel}`
    };
  }

  return { available: true };
}

export {
  cleanTranscript,
  checkLLMAvailability,
  CLEANING_SYSTEM_PROMPT
};
