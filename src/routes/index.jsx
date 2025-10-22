import { Title } from "@solidjs/meta";
import { createSignal, For, createMemo, onCleanup, Show, createEffect } from "solid-js";
import { query } from "~/stores/search";
import { entries, setEntries, isLoaded, isClient } from "~/stores/entries";
import AudioEntry from "~/components/AudioEntry";
import { deleteAudioById } from "~/database/audioDB";

export default function Home() {
  const [mounted, setMounted] = createSignal(false);

  createEffect(() => {
    setMounted(true);
  });

  function handleDelete(id) {
    const item = entries().find(e => e.id === id);
    if (!item) return;
    
    try {
      if (item.dbId) {
        deleteAudioById(item.dbId);
      }
      
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl);
      }
      setEntries(entries().filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }

  function handleDownload(id) {
    const item = entries().find(e => e.id === id);
    if (!item) return;
    console.log("download", id, item.title);
  }

  function handleRename(id, newTitle) {
    setEntries(entries().map(e => e.id === id ? { ...e, title: newTitle } : e));
  }

  const filtered = createMemo(() => {
    if (!isClient()) return [];
    const q = query().trim().toLowerCase();
    if (!q) return entries();
    return entries().filter(e => e.title.toLowerCase().includes(q));
  });

  const groups = createMemo(() => {
    if (!isClient()) return [];
    const list = filtered();
    const map = new Map();
    list.forEach(e => {
      const key = e.date || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  });

  return (
    <main class="home-root">
      <Title>Search</Title>
      {mounted() ? (
        <Show when={isClient() && isLoaded()} fallback={<div class="loading">Loading recordings...</div>}>
          <For each={groups()} fallback={<div class="muted">No recordings</div>}>
            {([date, items]) => (
              <section class="date-group">
                <h3>{date}</h3>
                <For each={items} fallback={<div class="muted">No results</div>}>
                  {(entry) => (
                    <AudioEntry 
                      id={entry.id} 
                      title={entry.title} 
                      blobUrl={entry.blobUrl} 
                      dbId={entry.dbId}
                      onDelete={handleDelete} 
                      onDownload={handleDownload} 
                      onRename={handleRename} 
                    />
                  )}
                </For>
              </section>
            )}
          </For>
        </Show>
      ) : (
        <div class="loading">Loading recordings...</div>
      )}
    </main>
  );
}
