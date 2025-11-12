/**
 * Database Module Entry Point
 *
 * This module provides access to both the legacy audioDB (IndexedDB-based)
 * and the new sessionDB (sessionlib service worker-based) implementations.
 *
 * For new projects, use sessionDB which provides audio fingerprinting and
 * play-to-search capabilities.
 */

// Legacy audioDB (direct IndexedDB access)
export {
  addAudio as addAudioLegacy,
  getAllAudio as getAllAudioLegacy,
  getAudioById as getAudioByIdLegacy,
  updateAudio as updateAudioLegacy,
  deleteAudioById as deleteAudioByIdLegacy
} from './audioDB.js';

// New sessionDB (sessionlib service worker-based)
export {
  addAudio,
  getAllAudio,
  getAudioById,
  updateAudio,
  deleteAudioById,
  searchAudio,
  searchAudioStream,
  initSessionDB
} from './sessionDB.js';

// Service worker initialization
export {
  registerSessionWorker,
  isServiceWorkerReady,
  waitForServiceWorker
} from './sessionWorkerInit.js';
