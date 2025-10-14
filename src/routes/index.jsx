import { Title } from "@solidjs/meta";
import { createSignal, For, createMemo } from "solid-js";
import { query } from "~/stores/search";
import { entries, setEntries } from "~/stores/entries";
import AudioEntry from "~/components/AudioEntry";


export default function Home() {
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

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return entries();
    return entries().filter(e => e.title.toLowerCase().includes(q));
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
      <For each={groups()} fallback={<div class="muted">No recordings</div>}>
        {([date, items]) => (
          <section class="date-group">
            <h3>{date}</h3>
            <For each={items} fallback={<div class="muted">No results</div>}>
              {(entry) => <AudioEntry id={entry.id} title={entry.title} blobUrl={entry.blobUrl} onDelete={handleDelete} onDownload={handleDownload} onRename={handleRename} />}
            </For>
          </section>
        )}
      </For>
    </main>
  );
}
