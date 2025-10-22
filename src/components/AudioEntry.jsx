import { createSignal, onMount, onCleanup, createMemo } from "solid-js";
import { getAudioById } from "~/database/audioDB";

export default function AudioEntry(props) {
  let root;
  const [open, setOpen] = createSignal(false);
  const [playing, setPlaying] = createSignal(false);
  const [blobUrl, setBlobUrl] = createSignal(null);
  let audioEl = null;

  onMount(async () => {
    if (props.dbId && !props.blobUrl) {
      try {
        const audioData = await getAudioById(props.dbId);
        if (audioData && audioData.blob) {
          const url = URL.createObjectURL(audioData.blob);
          setBlobUrl(url);
        }
      } catch (error) {
        console.error('Failed to load audio blob:', error);
      }
    } else if (props.blobUrl) {
      setBlobUrl(props.blobUrl);
    }

    const onDoc = (e) => {
      if (!root.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    
    return () => {
      document.removeEventListener("click", onDoc);
    };
  });
  
  onCleanup(() => {
    const url = blobUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  });

  function setAudioRef(el) {
    audioEl = el;
  }

  function togglePlay() {
    if (!audioEl) return;
    if (audioEl.paused) audioEl.play();
    else audioEl.pause();
  }

  function toggleMenu(e) {
    e.stopPropagation();
    setOpen(!open());
  }

  function handleDownload() {
    if (props.onDownload) {
      props.onDownload(props.id);
    } else {
      const url = blobUrl();
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${props.title || "recording"}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const blob = new Blob([`Recording: ${props.title}`], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${props.title || "recording"}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    }
    setOpen(false);
  }

  function handleDelete() {
    if (props.onDelete) props.onDelete(props.id);
    else console.log("delete", props.id);
    setOpen(false);
  }

  // rename feature
  const [editing, setEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal("");

  function startRename(e) {
    e.stopPropagation();
    setEditValue(props.title || "");
    setEditing(true);
    setOpen(false);
  }

  function saveRename() {
    const v = (editValue() || "").trim();
    if (v && props.onRename) props.onRename(props.id, v);
    setEditing(false);
  }

  function cancelRename() {
    setEditing(false);
  }

  return (
    <div class="audio-entry" ref={root}>
      <div class="entry-left">
        {!editing() ? (
          <>
            <div class="entry-title">{props.title}</div>
            <div class="entry-sub">{props.subtitle || ""}</div>
          </>
        ) : (
          <div class="rename-row">
            <input
              class="rename-input"
              value={editValue()}
              onInput={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }}
            />
            <button class="menu-item" onClick={saveRename}>Save</button>
            <button class="menu-item" onClick={cancelRename}>Cancel</button>
          </div>
        )}
        {blobUrl() && (
          <div class="player">
            <audio 
              ref={setAudioRef} 
              src={blobUrl()} 
              onplay={() => setPlaying(true)} 
              onpause={() => setPlaying(false)} 
              controls 
            />
          </div>
        )}
      </div>

      <div class="entry-right">
        <button class="dots-btn" aria-haspopup="true" aria-expanded={open()} onClick={toggleMenu} aria-label="options">⋯</button>
        {open() && (
          <div class="entry-menu" role="menu">
            <button class="menu-item" onClick={handleDownload} role="menuitem">Download</button>
            <button class="menu-item" onClick={startRename} role="menuitem">Rename</button>
            <button class="menu-item" onClick={handleDelete} role="menuitem">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}
