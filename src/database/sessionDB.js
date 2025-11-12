/**
 * SessionDB - Audio Database using Sessionlib Backend
 *
 * This module provides a compatible API with audioDB.js but uses the sessionlib
 * service worker for audio storage, fingerprinting, and search capabilities.
 */

import { waitForServiceWorker } from './sessionWorkerInit.js';

const API_BASE = '/v1';

// Ensure service worker is initialized
let initPromise = null;

async function ensureServiceWorker() {
  if (!initPromise) {
    initPromise = waitForServiceWorker();
  }
  await initPromise;
}

/**
 * Generate a UUID v4
 * @returns {string}
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert an audio blob to f32 mono 44.1kHz WAV format
 * @param {Blob} blob - Input audio blob
 * @returns {Promise<Blob>} - WAV blob in f32 format
 */
async function convertToF32Wav(blob) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 44100
  });

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Convert to mono if needed
    let audioData;
    if (audioBuffer.numberOfChannels === 1) {
      audioData = audioBuffer.getChannelData(0);
    } else {
      // Mix down to mono
      const channel1 = audioBuffer.getChannelData(0);
      const channel2 = audioBuffer.getChannelData(1);
      audioData = new Float32Array(channel1.length);
      for (let i = 0; i < channel1.length; i++) {
        audioData[i] = (channel1[i] + channel2[i]) / 2;
      }
    }

    // Create WAV blob
    const wavBlob = createWavBlob(audioData, 44100);
    return wavBlob;
  } finally {
    await audioContext.close();
  }
}

/**
 * Create a WAV blob from Float32Array
 * @param {Float32Array} audioData - Audio samples
 * @param {number} sampleRate - Sample rate
 * @returns {Blob}
 */
function createWavBlob(audioData, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 32;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = audioData.length * bitsPerSample / 8;
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 3, true); // IEEE float format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    view.setFloat32(offset + i * 4, audioData[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Add audio to the database
 * @param {Object} params - Parameters
 * @param {Blob} params.blob - Audio blob
 * @param {string} [params.name] - Audio name
 * @param {Array} [params.intervalHashes] - Interval hashes (deprecated, use sessionlib instead)
 * @param {boolean} [params.indexed=true] - Whether to index for search
 * @returns {Promise<string>} - UUID of the added audio
 */
export async function addAudio({ blob, name = null, intervalHashes = [], indexed = true }) {
  await ensureServiceWorker();

  const uuid = generateUUID();

  try {
    // Convert blob to f32 WAV format
    const wavBlob = await convertToF32Wav(blob);

    // Upload audio to service worker
    const putResponse = await fetch(`${API_BASE}/recordings/${uuid}`, {
      method: 'PUT',
      body: wavBlob,
      headers: {
        'Content-Type': 'audio/wav'
      }
    });

    if (!putResponse.ok) {
      throw new Error(`Failed to add audio: ${putResponse.statusText}`);
    }

    // Set metadata
    const metadata = {
      name: name || uuid,
      date: new Date().toISOString(),
      tags: [],
      indexed: indexed,
      timestamp: Date.now(),
      archived: false
    };

    const metaResponse = await fetch(`${API_BASE}/recordings/${uuid}/meta`, {
      method: 'POST',
      body: JSON.stringify(metadata),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!metaResponse.ok) {
      throw new Error(`Failed to set metadata: ${metaResponse.statusText}`);
    }

    return uuid;
  } catch (error) {
    console.error('Error adding audio:', error);
    throw error;
  }
}

/**
 * Get all audio entries
 * @returns {Promise<Array>} - Array of audio entries with metadata
 */
export async function getAllAudio() {
  await ensureServiceWorker();

  try {
    // Get list of all recording UUIDs
    const response = await fetch(`${API_BASE}/recordings/`);

    if (!response.ok) {
      throw new Error(`Failed to get recordings: ${response.statusText}`);
    }

    const text = await response.text();
    const uuids = text.split('\n').filter(uuid => uuid.trim());

    // Fetch metadata for each recording
    const audioEntries = await Promise.all(
      uuids.map(async (uuid) => {
        try {
          const metaResponse = await fetch(`${API_BASE}/recordings/${uuid}/meta`);
          if (!metaResponse.ok) {
            return null;
          }

          const metadata = await metaResponse.json();

          return {
            id: uuid,
            name: metadata.name,
            timestamp: new Date(metadata.date).getTime(),
            archived: metadata.archived || false,
            indexed: metadata.indexed !== false,
            intervalHashes: [], // Legacy field, not used with sessionlib
            blob: null // Lazy loaded
          };
        } catch (error) {
          console.error(`Error fetching metadata for ${uuid}:`, error);
          return null;
        }
      })
    );

    return audioEntries.filter(entry => entry !== null);
  } catch (error) {
    console.error('Error getting all audio:', error);
    throw error;
  }
}

/**
 * Get audio by ID
 * @param {string} id - UUID of the audio
 * @returns {Promise<Object|null>} - Audio entry with blob
 */
export async function getAudioById(id) {
  await ensureServiceWorker();

  try {
    // Fetch metadata
    const metaResponse = await fetch(`${API_BASE}/recordings/${id}/meta`);
    if (!metaResponse.ok) {
      return null;
    }

    const metadata = await metaResponse.json();

    // Fetch audio blob
    const audioResponse = await fetch(`${API_BASE}/recordings/${id}`);
    if (!audioResponse.ok) {
      return null;
    }

    const blob = await audioResponse.blob();

    return {
      id: id,
      name: metadata.name,
      timestamp: new Date(metadata.date).getTime(),
      archived: metadata.archived || false,
      indexed: metadata.indexed !== false,
      intervalHashes: [],
      blob: blob
    };
  } catch (error) {
    console.error(`Error getting audio ${id}:`, error);
    return null;
  }
}

/**
 * Update audio metadata
 * @param {string} id - UUID of the audio
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>}
 */
export async function updateAudio(id, updates) {
  await ensureServiceWorker();

  try {
    // Get current metadata
    const metaResponse = await fetch(`${API_BASE}/recordings/${id}/meta`);
    if (!metaResponse.ok) {
      throw new Error('Audio not found');
    }

    const metadata = await metaResponse.json();

    // Merge updates
    const updatedMetadata = {
      ...metadata,
      ...updates,
      // Map old fields to new format
      name: updates.name !== undefined ? updates.name : metadata.name,
      archived: updates.archived !== undefined ? updates.archived : metadata.archived,
      indexed: updates.indexed !== undefined ? updates.indexed : metadata.indexed
    };

    // Update metadata
    const putResponse = await fetch(`${API_BASE}/recordings/${id}/meta`, {
      method: 'POST',
      body: JSON.stringify(updatedMetadata),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!putResponse.ok) {
      throw new Error(`Failed to update metadata: ${putResponse.statusText}`);
    }

    return true;
  } catch (error) {
    console.error(`Error updating audio ${id}:`, error);
    throw error;
  }
}

/**
 * Delete audio by ID
 * Note: The current sessionlib API doesn't support deletion,
 * so we mark it as archived instead
 * @param {string} id - UUID of the audio
 * @returns {Promise<boolean>}
 */
export async function deleteAudioById(id) {
  await ensureServiceWorker();

  try {
    // Mark as archived and not indexed
    await updateAudio(id, {
      archived: true,
      indexed: false
    });

    return true;
  } catch (error) {
    console.error(`Error deleting audio ${id}:`, error);
    throw error;
  }
}

/**
 * Search for audio using an audio query (play-to-search)
 * @param {Blob} audioBlob - Audio blob to search for
 * @returns {Promise<Array>} - Array of search results
 */
export async function searchAudio(audioBlob) {
  await ensureServiceWorker();

  try {
    // Convert blob to f32 WAV format
    const wavBlob = await convertToF32Wav(audioBlob);

    // Send search request
    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      body: wavBlob,
      headers: {
        'Content-Type': 'audio/wav'
      }
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const results = await response.json();

    // Enhance results with metadata
    const enhancedResults = await Promise.all(
      results.map(async (result) => {
        try {
          const metaResponse = await fetch(`${API_BASE}/recordings/${result.uuid}/meta`);
          const metadata = metaResponse.ok ? await metaResponse.json() : {};

          return {
            ...result,
            name: metadata.name || result.uuid,
            timestamp: metadata.date ? new Date(metadata.date).getTime() : null
          };
        } catch (error) {
          return result;
        }
      })
    );

    return enhancedResults;
  } catch (error) {
    console.error('Error searching audio:', error);
    throw error;
  }
}

/**
 * Search for audio using live audio stream (buffers entire query then searches)
 * @param {MediaStream} stream - Audio stream from microphone or other source
 * @param {Object} options - Options
 * @param {number} [options.maxDuration=10] - Maximum duration in seconds to buffer
 * @returns {Promise<Object>} - Controller object with stop() method that performs the search
 */
export async function searchAudioStream(stream, options = {}) {
  await ensureServiceWorker();

  const {
    maxDuration = 10
  } = options;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 44100
  });

  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  let recordedChunks = [];
  let isRecording = true;
  const sampleRate = audioContext.sampleRate;
  const maxSamples = maxDuration * sampleRate;

  source.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (e) => {
    if (!isRecording) return;

    const inputData = e.inputBuffer.getChannelData(0);
    recordedChunks.push(new Float32Array(inputData));

    // Calculate total samples
    const totalSamples = recordedChunks.reduce((sum, chunk) => sum + chunk.length, 0);

    // Stop recording if we hit max duration
    if (totalSamples >= maxSamples) {
      console.log('Max duration reached, stopping recording');
      isRecording = false;
    }
  };

  return {
    stop: async () => {
      console.log('Stopping recording and performing search...');
      isRecording = false;
      processor.disconnect();
      source.disconnect();

      // Concatenate all recorded chunks
      const totalSamples = recordedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const audioData = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of recordedChunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`Recorded ${totalSamples} samples (${(totalSamples / sampleRate).toFixed(2)}s) at ${sampleRate}Hz`);

      // Create WAV blob and search
      const wavBlob = createWavBlob(audioData, sampleRate);
      console.log('Created WAV blob, sending to service worker for search...');

      try {
        const results = await searchAudio(wavBlob);
        console.log('Search completed! Results:', results);

        if (results.length === 0) {
          console.log('No matches found');
        } else {
          console.log(`Found ${results.length} match(es):`);
          results.slice(0, 10).forEach((result, index) => {
            const url = new URL(result.queryUrl, window.location.href);
            console.log(`"${result.name}" ${result.score.toFixed(2)} ${url}`);
            /*console.log(`     Score: ${result.score.toFixed(4)} (lower is better)`);
            console.log(`     Match time: ${result.keyStart.toFixed(2)}s - ${result.keyEnd.toFixed(2)}s`);
            console.log(`     Duration: ${(result.keyEnd - result.keyStart).toFixed(2)}s`);*/
          });
        }

        return results;
      } catch (error) {
        console.error('Error during search:', error);
        throw error;
      } finally {
        await audioContext.close();
      }
    }
  };
}

/**
 * Initialize the sessionlib service worker
 * Call this early in your application lifecycle
 * @returns {Promise<void>}
 */
export async function initSessionDB() {
  await ensureServiceWorker();
}
