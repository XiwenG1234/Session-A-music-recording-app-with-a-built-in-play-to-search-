import { Title } from "@solidjs/meta";
import { createSignal, For, createMemo } from "solid-js";
import { query } from "~/stores/search";
import AudioEntry from "~/components/AudioEntry";

const initialEntries = [
  { id: 1, title: "blah #1", date: "9/24" },
  { id: 2, title: "notes", date: "9/24" },
  { id: 3, title: "meeting", date: "6/15" },
];

export default function Home() {
  // use shared query from HeaderBar
  // local `query` variable kept for backwards compatibility in this file
  const [entries, setEntries] = createSignal(initialEntries);

  function handleDelete(id) {
    setEntries(entries().filter(e => e.id !== id));
  }

  function handleDownload(id) {
    const item = entries().find(e => e.id === id);
    if (!item) return;
    // For now AudioEntry provides a default download; this is a placeholder
    console.log("download", id, item.title);
  }

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return entries();
    return entries().filter(e => e.title.toLowerCase().includes(q));
  });

  return (
    <main class="home-root">
      <Title>Search</Title>

      {/* search input lives in the HeaderBar (top section) */}

      <section class="date-group">
        <h3>9/24</h3>
        <For each={filtered().filter(e => e.date === '9/24')} fallback={<div class="muted">No results</div>}>
          {(entry) => <AudioEntry id={entry.id} title={entry.title} onDelete={handleDelete} onDownload={handleDownload} />}
        </For>
        <div class="text-input-placeholder" />
        <div class="upload-box">drag & drop to upload</div>
      </section>

      <section class="date-group">
        <h3>6/15</h3>
        <For each={filtered().filter(e => e.date === '6/15')} fallback={<div class="muted">No results</div>}>
          {(entry) => <AudioEntry id={entry.id} title={entry.title} onDelete={handleDelete} onDownload={handleDownload} />}
        </For>
        <div class="text-input-placeholder" />
      </section>

      {/* record button moved to layout footer */}
    </main>
  );
}
