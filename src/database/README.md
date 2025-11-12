# Session Frontend Database Module

This module provides audio storage and search capabilities using the sessionlib service worker backend.

## Overview

The database module includes:

- **sessionDB.js**: Modern audio database using sessionlib for fingerprinting and search
- **audioDB.js**: Legacy IndexedDB-based storage (deprecated)
- **sessionWorkerInit.js**: Service worker registration and initialization

## Features

- Audio storage with metadata
- Automatic audio fingerprinting
- Play-to-search functionality (search by humming/playing audio)
- Real-time audio stream search
- Compatible API with legacy audioDB

## Quick Start

### 1. Initialize the Service Worker

Initialize the service worker early in your application (e.g., in your main entry point):

```javascript
import { initSessionDB } from './database';

// Initialize on app startup
await initSessionDB();
```

### 2. Add Audio to Database

```javascript
import { addAudio } from './database';

// From a file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const uuid = await addAudio({
    blob: file,
    name: file.name,
    indexed: true // Enable search indexing
  });
  console.log('Audio added with UUID:', uuid);
});

// From recorded audio
const mediaRecorder = new MediaRecorder(stream);
const chunks = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const uuid = await addAudio({
    blob: blob,
    name: 'My Recording',
    indexed: true
  });
};

mediaRecorder.start();
// ... later
mediaRecorder.stop();
```

### 3. Retrieve Audio

```javascript
import { getAllAudio, getAudioById } from './database';

// Get all audio entries
const allAudio = await getAllAudio();
console.log('Total recordings:', allAudio.length);

allAudio.forEach(audio => {
  console.log(`${audio.name} (${audio.id})`);
});

// Get specific audio by ID
const audio = await getAudioById(uuid);
if (audio) {
  const audioUrl = URL.createObjectURL(audio.blob);
  const audioElement = new Audio(audioUrl);
  audioElement.play();
}
```

### 4. Update Audio Metadata

```javascript
import { updateAudio } from './database';

await updateAudio(uuid, {
  name: 'Updated Name',
  archived: false,
  indexed: true
});
```

### 5. Delete Audio

```javascript
import { deleteAudioById } from './database';

// Mark as archived and remove from search index
await deleteAudioById(uuid);
```

## Play-to-Search Features

### Search with Audio Clip

Search the database using an audio clip (e.g., user hums a melody):

```javascript
import { searchAudio } from './database';

// From file upload
const searchFile = document.querySelector('#search-file');
searchFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const results = await searchAudio(file);

  console.log(`Found ${results.length} matches:`);
  results.forEach(result => {
    console.log(`- ${result.name}`);
    console.log(`  Score: ${result.score} (lower is better)`);
    console.log(`  Match: ${result.keyStart}s - ${result.keyEnd}s`);
    console.log(`  URL: ${result.queryUrl}`);
  });
});

// From recorded audio
const recorder = new MediaRecorder(stream);
const chunks = [];

recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const results = await searchAudio(blob);
  displayResults(results);
};
```

### Stream Search (Buffer and Search)

Record audio from a stream, then search when you stop recording:

```javascript
import { searchAudioStream } from './database';

// Start microphone
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Start buffering audio
const controller = await searchAudioStream(
  stream,
  {
    maxDuration: 30  // Stop automatically after 30 seconds
  }
);

// When ready, stop and search
// Results will be logged to the console
const results = await controller.stop();

// Display results in UI
if (results.length > 0) {
  console.log('Match found!', results[0].name);
  displayMatch(results[0]);
}

// Clean up stream
stream.getTracks().forEach(track => track.stop());
```

## Complete Example: Play-to-Search UI

```javascript
import {
  initSessionDB,
  addAudio,
  getAllAudio,
  searchAudioStream
} from './database';

class PlayToSearchApp {
  constructor() {
    this.isRecording = false;
    this.searchController = null;
  }

  async init() {
    // Initialize service worker
    await initSessionDB();

    // Load and display all recordings
    await this.loadRecordings();

    // Setup UI event listeners
    this.setupUI();
  }

  async loadRecordings() {
    const recordings = await getAllAudio();
    const list = document.querySelector('#recordings-list');

    list.innerHTML = recordings.map(recording => `
      <div class="recording" data-id="${recording.id}">
        <span>${recording.name}</span>
        <span>${new Date(recording.timestamp).toLocaleString()}</span>
      </div>
    `).join('');
  }

  setupUI() {
    // Record button
    document.querySelector('#record-btn').addEventListener('click', () => {
      this.toggleRecording();
    });

    // Search button
    document.querySelector('#search-btn').addEventListener('click', () => {
      this.toggleSearch();
    });
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    this.mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    this.mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const name = prompt('Name this recording:');

      await addAudio({
        blob: blob,
        name: name || 'Untitled',
        indexed: true
      });

      await this.loadRecordings();
      stream.getTracks().forEach(track => track.stop());
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  async toggleSearch() {
    if (this.searchController) {
      // Stop recording and perform search
      document.querySelector('#search-status').textContent = 'Searching...';

      const results = await this.searchController.stop();
      this.searchController = null;
      this.stream.getTracks().forEach(track => track.stop());

      // Display results
      if (results && results.length > 0) {
        const match = results[0];
        document.querySelector('#search-results').innerHTML = `
          <div class="match">
            <h3>Match Found!</h3>
            <p><strong>${match.name}</strong></p>
            <p>Score: ${match.score.toFixed(2)}</p>
            <p>Time: ${match.keyStart.toFixed(1)}s - ${match.keyEnd.toFixed(1)}s</p>
          </div>
        `;
      }

      document.querySelector('#search-status').textContent = 'Not searching';
      return;
    }

    // Start recording
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    document.querySelector('#search-status').textContent = 'Recording... (click to search)';

    this.searchController = await searchAudioStream(
      this.stream,
      {
        maxDuration: 30  // Max 30 seconds
      }
    );
  }
}

// Initialize app
const app = new PlayToSearchApp();
app.init();
```

## API Reference

### `initSessionDB()`

Initialize the sessionlib service worker. Should be called once at application startup.

**Returns:** `Promise<void>`

---

### `addAudio({ blob, name, indexed })`

Add audio to the database.

**Parameters:**
- `blob` (Blob): Audio blob in any format supported by Web Audio API
- `name` (string, optional): Name for the audio. Defaults to UUID
- `indexed` (boolean, optional): Whether to index for search. Defaults to `true`

**Returns:** `Promise<string>` - UUID of the added audio

---

### `getAllAudio()`

Get all audio entries with metadata.

**Returns:** `Promise<Array>` - Array of audio entries

---

### `getAudioById(id)`

Get a specific audio entry by UUID.

**Parameters:**
- `id` (string): UUID of the audio

**Returns:** `Promise<Object|null>` - Audio entry with blob, or null if not found

---

### `updateAudio(id, updates)`

Update audio metadata.

**Parameters:**
- `id` (string): UUID of the audio
- `updates` (Object): Fields to update (name, archived, indexed, etc.)

**Returns:** `Promise<boolean>` - Success status

---

### `deleteAudioById(id)`

Delete audio by marking it as archived and removing from search index.

**Parameters:**
- `id` (string): UUID of the audio

**Returns:** `Promise<boolean>` - Success status

---

### `searchAudio(audioBlob)`

Search for audio using an audio clip.

**Parameters:**
- `audioBlob` (Blob): Audio blob to search for

**Returns:** `Promise<Array>` - Array of search results with:
  - `uuid`: Recording UUID
  - `name`: Recording name
  - `score`: Similarity score (lower is better)
  - `keyStart`, `keyEnd`: Match timestamps in the recording
  - `queryStart`, `queryEnd`: Match timestamps in the query
  - `queryUrl`: Direct URL to the match

---

### `searchAudioStream(stream, options)`

Buffer audio from a live stream, then search when stopped.

**Parameters:**
- `stream` (MediaStream): Audio stream from microphone or other source
- `options` (Object, optional):
  - `maxDuration` (number): Maximum duration in seconds to buffer. Default: 10

**Returns:** `Promise<Object>` - Controller object with:
  - `stop()` method: Stops recording, performs search, logs results to console, and returns results array

**Console Output:**
When `stop()` is called, the function logs detailed search information including:
- Number of samples recorded and duration
- Search progress
- All match results with scores, timestamps, and durations

---

## Migration from audioDB

If you're using the legacy `audioDB`, migration is straightforward:

1. Import from the new module:
```javascript
// Old
import { addAudio } from './database/audioDB';

// New
import { addAudio } from './database';
```

2. Initialize the service worker:
```javascript
import { initSessionDB } from './database';
await initSessionDB();
```

3. The API is compatible! Most functions work the same way.

4. New features available:
   - `searchAudio()` - Search by audio clip
   - `searchAudioStream()` - Buffer and search audio streams

## Notes

- Audio is automatically converted to f32 mono 44.1kHz WAV format for storage
- Audio fingerprinting happens automatically when `indexed: true`
- The service worker uses a separate IndexedDB database from the legacy audioDB
- Search results include similarity scores (lower is better)
- Stream search buffers entire query before searching and logs results to console

## Troubleshooting

**Service worker not registering:**
- Ensure your app is served over HTTPS (or localhost for development)
- Check browser console for errors
- Verify the service worker path is correct

**No search results:**
- Ensure audio is marked as `indexed: true`
- Try increasing the search audio duration
- Check that the query audio has sufficient content

**Audio quality issues:**
- The system uses 44.1kHz sample rate
- Mono audio is automatically created from stereo
- Float32 PCM format is used internally
