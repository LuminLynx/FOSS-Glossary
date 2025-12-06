// API Handler for Term Generation
// Uses GitHub Models API for AI-powered term drafting

// Constants
const MIN_DEFINITION_LENGTH = 80;

/**
 * TermDrafterAPI - Handles AI-powered term generation
 * Stores API key in localStorage for client-side use on GitHub Pages
 */
class TermDrafterAPI {
  constructor() {
    this.apiKeyStorageKey = 'github-models-key';
    this.apiKeySaltKey = 'github-models-key-salt';
    this.apiEndpoint = 'https://models.inference.ai.azure.com/chat/completions';
    this.model = 'gpt-4o-mini';
  }

  // --- Encryption/Decryption helpers using Web Crypto API ---
  async _getKeyFromPassphrase(passphrase, saltBase64) {
    const enc = new TextEncoder();
    const salt = saltBase64 ? this._base64ToBytes(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    return { key, salt: this._bytesToBase64(salt) };
  }

  async _encryptAPIKey(apiKey, passphrase) {
    const enc = new TextEncoder();
    const { key, salt } = await this._getKeyFromPassphrase(passphrase, null);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(apiKey)
    );
    return {
      ciphertext: this._bytesToBase64(new Uint8Array(ciphertext)),
      iv: this._bytesToBase64(iv),
      salt: salt
    };
  }

  async _decryptAPIKey(storageObj, passphrase) {
    try {
      const dec = new TextDecoder();
      const { key } = await this._getKeyFromPassphrase(passphrase, storageObj.salt);
      const iv = this._base64ToBytes(storageObj.iv);
      const ciphertext = this._base64ToBytes(storageObj.ciphertext);
      const plaintext = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      );
      return dec.decode(plaintext);
    } catch (err) {
      throw new Error("Incorrect passphrase or corrupted data.");
    }
  }

  _bytesToBase64(buf) {
    let bin = '';
    buf.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  _base64ToBytes(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }

  /**
   * Get the stored API key
   * @returns {string|null} The API key or null if not set
   */
  async getApiKey() {
    const storage = localStorage.getItem(this.apiKeyStorageKey);
    if (!storage) return null;
    let obj;
    try {
      obj = JSON.parse(storage);
    } catch (e) { return null; }
    const passphrase = await this._promptPassphrase("Enter passphrase to unlock API key:");
    if (!passphrase) return null;
    try {
      return await this._decryptAPIKey(obj, passphrase);
    } catch (err) {
      alert("Decryption failed: " + err.message);
      return null;
    }
  }

  /**
   * Set the API key
   * @param {string} apiKey - The API key to encrypt and store
   */
  async setApiKey(apiKey) {
    if (apiKey && apiKey.trim()) {
      const passphrase = await this._promptPassphrase("Set a passphrase for your API key:");
      if (!passphrase) {
        alert("API key not saved: no passphrase provided.");
        return;
      }
      const encrypted = await this._encryptAPIKey(apiKey.trim(), passphrase);
      localStorage.setItem(this.apiKeyStorageKey, JSON.stringify(encrypted));
    }
  }

  /**
   * Util: Prompt user for a passphrase (customize as needed)
   */
  async _promptPassphrase(msg) {
    return window.prompt(msg);
  }

  /**
   * Check if API key is configured
   * @returns {boolean} True if API key exists
   */
  async hasApiKey() {
    const key = await this.getApiKey();
    return key !== null && key.trim() !== '';
  }

  /**
   * Clear the stored API key
   */
  clearApiKey() {
    localStorage.removeItem(this.apiKeyStorageKey);
  }

  /**
   * Generate a term entry using AI
   * @param {string} termName - The term to generate a definition for
   * @param {string} context - Optional additional context
   * @returns {Promise<Object>} The generated term object
   */
  async generateTerm(termName, context) {
    if (!this.hasApiKey()) {
      throw new Error('Please set your GitHub Models API key first');
    }

    if (!termName || !termName.trim()) {
      throw new Error('Term name is required');
    }

    const systemPrompt = `You are an expert at creating FOSS Glossary entries. Generate a glossary entry in YAML format for the given term.

The entry must follow this exact structure:
- slug: kebab-case identifier (lowercase, hyphens only, 3-48 chars)
- term: The term name (capitalize appropriately)
- definition: A clear, accurate definition (minimum ${MIN_DEFINITION_LENGTH} characters)
- explanation: An optional deeper explanation
- humor: A witty, humorous take on the term (be creative but appropriate)
- tags: 1-4 relevant lowercase tags
- see_also: Related terms (optional, 0-3 items)

Important:
- The definition must be at least ${MIN_DEFINITION_LENGTH} characters long
- Use proper YAML formatting
- Be accurate, educational, and add personality/humor
- Tags should be lowercase, single words
- The slug should be derived from the term name

Respond ONLY with valid YAML, no markdown code blocks, no explanation.`;

    const userPrompt = `Generate a FOSS Glossary entry for: "${termName}"${context ? `\n\nAdditional context: ${context}` : ''}`;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your GitHub Models API key.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(
          errorData.error?.message || `API request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      const content = data.choices[0].message.content;
      return this.parseYamlResponse(content);
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw error;
    }
  }

  /**
   * Parse YAML response and convert to JSON object
   * @param {string} content - The YAML content from AI response
   * @returns {Object} Parsed term object
   */
  parseYamlResponse(content) {
    // Remove markdown code blocks if present
    let yaml = content.trim();
    if (yaml.startsWith('```yaml')) {
      yaml = yaml.replace(/^```yaml\s*/, '').replace(/\s*```$/, '');
    } else if (yaml.startsWith('```')) {
      yaml = yaml.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse YAML to object
    return this.simpleYamlToJson(yaml);
  }

  /**
   * Simple YAML parser for our specific schema
   * Handles basic YAML structures used in term entries
   * @param {string} yaml - YAML string to parse
   * @returns {Object} Parsed object
   */
  simpleYamlToJson(yaml) {
    const lines = yaml.split('\n');
    const result = {};
    let currentKey = null;
    let currentArray = null;
    let multilineValue = '';
    let inMultiline = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for array items
      if (trimmedLine.startsWith('- ') && currentArray !== null) {
        const value = trimmedLine.substring(2).trim();
        result[currentArray].push(this.cleanValue(value));
        continue;
      }

      // Check for key-value pairs
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Check if this starts an array
        if (!value) {
          // Check if next line is an array item
          const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
          if (nextLine.startsWith('- ')) {
            currentArray = key;
            result[key] = [];
            continue;
          }
        }

        currentArray = null;
        currentKey = key;

        // Handle multiline strings (| or >)
        if (value === '|' || value === '>') {
          inMultiline = true;
          multilineValue = '';
          continue;
        }

        result[key] = this.cleanValue(value);
      } else if (inMultiline && currentKey) {
        // Continue reading multiline value
        if (line.startsWith('  ') || line.startsWith('\t')) {
          multilineValue += (multilineValue ? ' ' : '') + trimmedLine;
        } else {
          // End of multiline
          result[currentKey] = multilineValue;
          inMultiline = false;
          currentKey = null;
          i--; // Reprocess this line
        }
      }
    }

    // Handle any remaining multiline value
    if (inMultiline && currentKey && multilineValue) {
      result[currentKey] = multilineValue;
    }

    // Validate required fields
    if (!result.slug || !result.term || !result.definition) {
      throw new Error('Generated term is missing required fields (slug, term, or definition)');
    }

    // Ensure definition meets minimum length
    if (result.definition.length < MIN_DEFINITION_LENGTH) {
      throw new Error(
        `Definition is too short (${result.definition.length} chars). Minimum ${MIN_DEFINITION_LENGTH} characters required.`
      );
    }

    return result;
  }

  /**
   * Clean a YAML value - remove quotes, handle special characters
   * @param {string} value - The value to clean
   * @returns {string} Cleaned value
   */
  cleanValue(value) {
    if (!value) return '';

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Unescape common sequences
    value = value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");

    return value.trim();
  }

  /**
   * Convert term object to YAML string
   * @param {Object} term - The term object to convert
   * @returns {string} YAML formatted string
   */
  termToYaml(term) {
    let yaml = '';

    /**
     * Escape a string value for YAML double-quoted format
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    const escapeYamlValue = (str) => {
      if (!str) return '';
      // Escape backslashes first, then double quotes
      return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    };

    // Required fields
    yaml += `slug: ${term.slug}\n`;
    yaml += `term: ${term.term}\n`;
    yaml += `definition: "${escapeYamlValue(term.definition)}"\n`;

    // Optional fields
    if (term.explanation) {
      yaml += `explanation: "${escapeYamlValue(term.explanation)}"\n`;
    }

    if (term.humor) {
      yaml += `humor: "${escapeYamlValue(term.humor)}"\n`;
    }

    if (term.tags && term.tags.length > 0) {
      yaml += 'tags:\n';
      term.tags.forEach((tag) => {
        yaml += `  - ${tag}\n`;
      });
    }

    if (term.see_also && term.see_also.length > 0) {
      yaml += 'see_also:\n';
      term.see_also.forEach((item) => {
        yaml += `  - ${item}\n`;
      });
    }

    return yaml;
  }

  /**
   * Parse YAML string back to term object
   * @param {string} yaml - YAML string to parse
   * @returns {Object} Term object
   */
  yamlToTerm(yaml) {
    return this.simpleYamlToJson(yaml);
  }
}

// Export for use in app.js
if (typeof window !== 'undefined') {
  window.TermDrafterAPI = TermDrafterAPI;
}
