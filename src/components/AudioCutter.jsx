import { createSignal, Show } from "solid-js";
import { addAudio } from "~/database/audioDB";
import { entries, setEntries } from "~/stores/entries";

export default function AudioCutter(props) {
  const [startTime, setStartTime] = createSignal("");
  const [endTime, setEndTime] = createSignal("");
  const [processing, setProcessing] = createSignal(false);
  const [error, setError] = createSignal("");

  // Convert time string (MM:SS or HH:MM:SS) to seconds
  function parseTimeToSeconds(timeStr) {
    const parts = timeStr.trim().split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN)) return null;
    
    if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }

  // Format seconds to MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async function handleCut() {
    // Clear previous error
    setError("");

    const start = parseTimeToSeconds(startTime());
    const end = parseTimeToSeconds(endTime());

    if (start === null || end === null) {
      setError("Invalid time input. Please use MM:SS or HH:MM:SS format and try again.");
      return;
    }

    if (start >= end) {
      setError("Invalid time input. Please ensure start time is before end time.");
      return;
    }

    setProcessing(true);

    try {
      // Get the audio blob URL
      let blobUrl = props.blobUrl;
      
      // If no blobUrl provided, we need to fetch it from the database
      if (!blobUrl && props.dbId) {
        const { getAudioById } = await import("~/database/audioDB");
        const audioData = await getAudioById(props.dbId);
        if (audioData && audioData.blob) {
          blobUrl = URL.createObjectURL(audioData.blob);
        }
      }

      if (!blobUrl) {
        throw new Error("No audio source available");
      }

      // Fetch the audio file
      const response = await fetch(blobUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;

      // Calculate sample positions
      const startSample = Math.floor(start * sampleRate);
      const endSample = Math.floor(end * sampleRate);

      // Calculate the length of the new audio (total - cut segment)
      const cutLength = endSample - startSample;
      const newLength = audioBuffer.length - cutLength;

      // Create new audio buffer
      const newAudioBuffer = audioContext.createBuffer(
        numberOfChannels,
        newLength,
        sampleRate
      );

      // Copy audio data, skipping the cut section
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel);
        const newData = newAudioBuffer.getChannelData(channel);

        // Copy before cut section
        for (let i = 0; i < startSample; i++) {
          newData[i] = oldData[i];
        }

        // Copy after cut section
        for (let i = endSample; i < audioBuffer.length; i++) {
          newData[i - cutLength] = oldData[i];
        }
      }

      // Convert to WAV blob
      const wavBlob = await audioBufferToWav(newAudioBuffer);

      // Generate new title with version number
      const newTitle = generateVersionedTitle(props.title);

      // Save to database
      const dbId = await addAudio({
        blob: wavBlob,
        name: newTitle,
        intervalHashes: []
      });

      // Add to entries
      const id = Date.now() + Math.random();
      const date = new Date().toLocaleDateString();

      setEntries([
        {
          id,
          title: newTitle,
          date,
          blobUrl: null,
          dbId: dbId,
          timestamp: Date.now(),
          archived: false,
          starred: false
        },
        ...entries()
      ]);

      // Clean up
      audioContext.close();
      if (props.onClose) props.onClose();
      
    } catch (error) {
      console.error("Failed to cut audio:", error);
      setError("Invalid time input");
    } finally {
      setProcessing(false);
    }
  }

  // Generate a versioned title like "Recording (1)", "Recording (2)", etc.
  function generateVersionedTitle(originalTitle) {
    const existingTitles = entries().map(e => e.title);
    
    // Check if title already has a version number
    const versionMatch = originalTitle.match(/^(.+?)\s*\((\d+)\)$/);
    const baseName = versionMatch ? versionMatch[1] : originalTitle;
    
    let version = 1;
    let newTitle = `${baseName} (${version})`;
    
    while (existingTitles.includes(newTitle)) {
      version++;
      newTitle = `${baseName} (${version})`;
    }
    
    return newTitle;
  }

  // Convert AudioBuffer to WAV Blob
  async function audioBufferToWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = [];
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        // Convert float to 16-bit PCM
        const intSample = Math.max(-1, Math.min(1, sample));
        data.push(intSample < 0 ? intSample * 0x8000 : intSample * 0x7fff);
      }
    }

    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // Write WAV header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      view.setInt16(offset, data[i], true);
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function handleCancel() {
    if (props.onClose) props.onClose();
  }

  return (
    <div class="audio-cutter-overlay" onClick={handleCancel}>
      <div class="audio-cutter-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 class="cutter-title">Cut Audio</h3>
        <p class="cutter-subtitle">{props.title}</p>
        
        {/* Error popup */}
        <Show when={error()}>
          <div class="error-popup">
            {error()}
          </div>
        </Show>
        
        <div class="cutter-inputs">
          <div class="time-input-group">
            <label for="start-time">Cut from:</label>
            <input
              id="start-time"
              type="text"
              class="time-input"
              placeholder="MM:SS or HH:MM:SS"
              value={startTime()}
              onInput={(e) => setStartTime(e.target.value)}
              disabled={processing()}
            />
          </div>
          
          <div class="time-input-group">
            <label for="end-time">Cut to:</label>
            <input
              id="end-time"
              type="text"
              class="time-input"
              placeholder="MM:SS or HH:MM:SS"
              value={endTime()}
              onInput={(e) => setEndTime(e.target.value)}
              disabled={processing()}
            />
          </div>
        </div>

        <div class="cutter-info">
          <p>This will remove the segment between the specified times.</p>
          <p>Example: 00:23-00:45 removes 23 seconds to 45 seconds</p>
        </div>

        <div class="cutter-actions">
          <button
            class="cutter-btn cutter-btn-cancel"
            onClick={handleCancel}
            disabled={processing()}
          >
            Cancel
          </button>
          <button
            class="cutter-btn cutter-btn-cut"
            onClick={handleCut}
            disabled={processing()}
          >
            <Show when={processing()} fallback="Cut Audio">
              Processing...
            </Show>
          </button>
        </div>
      </div>
    </div>
  );
}
