import { Title } from "@solidjs/meta";
import { createSignal, For, createMemo } from "solid-js";
import { query } from "~/stores/search";
import { entries, setEntries } from "~/stores/entries";
import AudioEntry from "~/components/AudioEntry";
import ArchiveButton from "~/components/ArchiveButton";


export default function Home() {
  const [showStarredOnly, setShowStarredOnly] = createSignal(false);

  function handleDelete(id) {
    setEntries(entries().filter(e => e.id !== id));
  }

  function handleDownload(id) {
    const item = entries().find(e => e.id === id);
    if (!item) return;
    console.log("download", id, item.title);
  }

  function handleRename(id, newTitle) {
    setEntries(entries().map(e => e.id === id ? { ...e, title: newTitle } : e));
  }

  function handleToggleStar(id) {
    setEntries(entries().map(e => 
      e.id === id ? { ...e, starred: !e.starred } : e
    ));
  }
/*
  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return entries();
    return entries().filter(e => e.title.toLowerCase().includes(q));
  });
  */
  const filtered = createMemo(() => {
  const q = query().trim().toLowerCase();
  let list = entries();
  
  // Apply search filter
  if (q) {
    list = list.filter(e => e.title.toLowerCase().includes(q));
  }
  
  // If starred mode is on, sort starred items to the top
  if (showStarredOnly()) {
    list = [...list].sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return 0;
    });
  }
  
  return list;
});

  const groups = createMemo(() => {
    const list = filtered();
    const map = new Map();
    list.forEach(e => {
      const key = e.date || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    // return array of [date, items], sorted by date descending
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  });

  return (
    <main class="home-root">
      <Title>Search</Title>
      <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
       <ArchiveButton 
        archiveMode={showStarredOnly()} 
        onToggleArchive={() => setShowStarredOnly(!showStarredOnly())}
       />
      </div>
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
                  starred={entry.starred || false}
                  onDelete={handleDelete} 
                  onDownload={handleDownload} 
                  onRename={handleRename}
                  onToggleStar={handleToggleStar}
                />
              )}
            </For>
          </section>
        )}
      </For>
    </main>
  );
}