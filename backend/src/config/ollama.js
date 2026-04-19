/**
 * Ollama configuration module
 * Provides configuration values and utilities for connecting to Ollama
 */

const config = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  llmModel: process.env.LLM_MODEL || 'gpt-oss:20b',

  // Timeout settings (in milliseconds)
  timeouts: {
    llm: 120000  // 2 minutes for LLM cleaning
  }
};

/**
 * Check if Ollama is reachable
 * @returns {Promise<boolean>}
 */
async function checkOllamaConnection() {
  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a specific model is available in Ollama
 * @param {string} modelName - Name of the model to check
 * @returns {Promise<boolean>}
 */
async function isModelAvailable(modelName) {
  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const models = data.models || [];

    return models.some(model =>
      model.name === modelName ||
      model.name.startsWith(`${modelName}:`)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get list of available models from Ollama
 * @returns {Promise<string[]>}
 */
async function getAvailableModels() {
  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.models || []).map(model => model.name);
  } catch (error) {
    return [];
  }
}

export {
  config,
  checkOllamaConnection,
  isModelAvailable,
  getAvailableModels
};
