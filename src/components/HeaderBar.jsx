import { query, setQuery } from "~/stores/search";
import { startRecording, stopRecording, isRecording, duration } from "~/stores/recorder";
import { createSignal } from "solid-js";
import FileUploadButton from "~/components/FileUpload";

export default function HeaderBar() {
  const [local, setLocal] = createSignal(query());

  function onInput(e) {
    const v = e.target.value;
    setLocal(v);
    setQuery(v);
  }

  return (
    <div class="header-bar">
      <div class="search-row">
        <div class="search-input">
          <span class="search-icon">🔍</span>
          <input value={local()} onInput={onInput} placeholder="Search Recordings" aria-label="search" />
          {local() && <button class="clear-btn" onclick={() => { setLocal(""); setQuery(""); }} aria-label="clear search">✕</button>}
        </div>
        <button
          class="play-search"
          aria-label="record to search"
          onClick={() => (isRecording() ? stopRecording() : startRecording())}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19 11v1a7 7 0 0 1-14 0v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 19v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <FileUploadButton />
      </div>
    </div>
  );
}
