import { createSignal } from "solid-js";
import { entries, setEntries } from "~/stores/entries";
import { addToast } from "~/stores/toast";
import { addAudio, searchAudioStream } from "~/database";
import { setQuery } from "~/stores/search";

// Recording state (for regular recording)
let mediaRecorder = null;
let recordMediaStream = null;
let chunks = [];
let recordStartTs = 0;
let recordTimer = null;

const [isRecording, setIsRecording] = createSignal(false);
const [duration, setDuration] = createSignal(0); // seconds
const [lastBlobUrl, setLastBlobUrl] = createSignal(null);

// Search state (for play-to-search)
let searchController = null;
let searchMediaStream = null;
let searchStartTs = 0;
let searchTimer = null;

const [isSearching, setIsSearching] = createSignal(false);
const [searchDuration, setSearchDuration] = createSignal(0);
const [searchResults, setSearchResults] = createSignal([]);

function _recordTick() {
  setDuration(Math.floor((Date.now() - recordStartTs) / 1000));
}

function _searchTick() {
  setSearchDuration(Math.floor((Date.now() - searchStartTs) / 1000));
}

// Regular recording functions (for record button)
export async function startRecording() {
  try {
    recordMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(recordMediaStream);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.start();
    recordStartTs = Date.now();
    setDuration(0);
    recordTimer = setInterval(_recordTick, 250);
    setIsRecording(true);
  } catch (err) {
    console.error('startRecording error', err);
    throw err;
  }
}

export function stopRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });

    try {
      const dbId = await addAudio({
        blob: blob,
        name: `Recording ${new Date().toLocaleTimeString()}`,
        indexed: true  // Enable search indexing
      });

      const id = Date.now();
      const title = `Recording ${new Date().toLocaleTimeString()}`;
      const date = new Date().toLocaleDateString();

      setEntries([{
        id,
        title,
        date,
        blobUrl: null,
        dbId: dbId,
        timestamp: Date.now(),
        archived: false
      }, ...entries()]);

      addToast('Recording saved');
    } catch (error) {
      console.error('Failed to save recording:', error);
      addToast('Failed to save recording');
    }

    // stop all tracks
    if (recordMediaStream) {
      recordMediaStream.getTracks().forEach(t => t.stop());
      recordMediaStream = null;
    }
    chunks = [];
    if (recordTimer) clearInterval(recordTimer);
    setDuration(0);
    setIsRecording(false);
  };
  mediaRecorder.stop();
  mediaRecorder = null;
}

// Play-to-search functions (for shazam button)
export async function startSearch() {
  try {
    searchMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Use searchAudioStream to buffer audio
    searchController = await searchAudioStream(searchMediaStream, {
      maxDuration: 30  // Max 30 seconds
    });

    searchStartTs = Date.now();
    setSearchDuration(0);
    searchTimer = setInterval(_searchTick, 250);
    setIsSearching(true);
    setSearchResults([]);

    addToast('Recording for search... Stop to find matches');
  } catch (err) {
    console.error('startSearch error', err);
    addToast('Failed to access microphone');
    throw err;
  }
}

export async function stopSearch() {
  if (!searchController) return;

  setIsSearching(false);
  if (searchTimer) clearInterval(searchTimer);

  addToast('Searching...');

  try {
    // Stop and search
    const results = await searchController.stop();
    searchController = null;

    // Stop media stream
    if (searchMediaStream) {
      searchMediaStream.getTracks().forEach(t => t.stop());
      searchMediaStream = null;
    }

    setSearchDuration(0);
    setSearchResults(results);

    // Display results
    if (results && results.length > 0) {
      const topMatch = results[0];
      addToast(`Found ${results.length} match(es)! Top: ${topMatch.name} (score: ${topMatch.score.toFixed(3)})`);

      // Optionally set the search query to show the top result
      // setQuery(topMatch.name);

      console.log('Search results:', results);
    } else {
      addToast('No matches found');
    }
  } catch (error) {
    console.error('Search failed:', error);
    addToast('Search failed: ' + error.message);

    // Cleanup on error
    if (searchMediaStream) {
      searchMediaStream.getTracks().forEach(t => t.stop());
      searchMediaStream = null;
    }
    setSearchDuration(0);
  }
}

export { isRecording, duration, lastBlobUrl, isSearching, searchDuration, searchResults, setSearchResults };
