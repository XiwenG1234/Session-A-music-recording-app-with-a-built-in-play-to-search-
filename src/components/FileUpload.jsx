import { entries, setEntries } from "~/stores/entries";
import { addToast } from "~/stores/toast";

export default function FileUploadButton() {
  let fileInputRef;

  const handleFiles = (files) => {
    // Accept commmon audio files
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm', '.opus'];
    const audioFiles = Array.from(files).filter(file => {
      const hasAudioType = file.type.startsWith('audio/');
      const hasAudioExtension = audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      const isWebm = file.type === 'video/webm' || file.name.toLowerCase().endsWith('.webm');
      return hasAudioType || hasAudioExtension || isWebm;
    });

    if (audioFiles.length === 0) {
      addToast('No audio files found');
      return;
    }

    audioFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      const id = Date.now() + Math.random(); // ensure unique ID
      const title = file.name.replace(/\.[^/.]+$/, ""); // removes the extension
      const date = new Date().toLocaleDateString();
      
      setEntries([{ id, title, date, blobUrl: url }, ...entries()]);
    });

    addToast(`Uploaded ${audioFiles.length} file${audioFiles.length > 1 ? 's' : ''}`);
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    e.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <button
        class="upload-btn"
        onClick={triggerFileInput}
        aria-label="upload audio files"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 8l-5-5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </>
  );
}
