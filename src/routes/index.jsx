import { Title } from "@solidjs/meta";
import { createSignal, For, createMemo, onCleanup, Show, createEffect } from "solid-js";
import { query } from "~/stores/search";
import { entries, setEntries, isLoaded, isClient, showArchived, setShowArchived } from "~/stores/entries";
import AudioEntry from "~/components/AudioEntry";
import { deleteAudioById, updateAudio } from "~/database/audioDB";
import ArchiveButton from "~/components/ArchiveButton";

export default function Home() {
  const [mounted, setMounted] = createSignal(false);
  const [showStarredOnly, setShowStarredOnly] = createSignal(false);

  createEffect(() => {
    setMounted(true);
  });

  async function handleDelete(id) {
    const item = entries().find(e => e.id === id);
    if (!item) return;
    
    try {
      if (showArchived()) {
        // Permanently delete from archived items
        if (item.dbId) {
          await deleteAudioById(item.dbId);
        }
        
        if (item.blobUrl) {
          URL.revokeObjectURL(item.blobUrl);
        }
       
        setEntries(entries().filter(e => e.id !== id));
      } else {
        // Archive the item (soft delete)
        if (item.dbId) {
          await updateAudio(item.dbId, { archived: true });
        }
        
        // Update in-memory state
        setEntries(entries().map(e => 
          e.id === id ? { ...e, archived: true } : e
        ));
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }

  async function handleRename(id, newTitle) {
    const item = entries().find(e => e.id === id);
    if (!item) return;
    
    // Update in-memory state
    setEntries(entries().map(e => e.id === id ? { ...e, title: newTitle } : e));
    
    // Persist to IndexedDB
    if (item.dbId) {
      try {
        await updateAudio(item.dbId, { name: newTitle });
      } catch (error) {
        console.error('Failed to update recording name:', error);
      }
    }
  }

  async function handleToggleStar(id) {
    const item = entries().find(e => e.id === id);
    if (!item) return;
    
    const newStarredState = !item.starred;
    
    // Update in-memory state
    setEntries(entries().map(e => 
      e.id === id ? { ...e, starred: newStarredState } : e
    ));
    
    // Persist to IndexedDB
    if (item.dbId) {
      try {
        await updateAudio(item.dbId, { starred: newStarredState });
      } catch (error) {
        console.error('Failed to update starred state:', error);
      }
    }
  }

  async function handleRestore(id) {
    const item = entries().find(e => e.id === id);
    if (!item) return;
    
    try {
      // Restore from archive (unarchive)
      if (item.dbId) {
        await updateAudio(item.dbId, { archived: false });
      }
      
      // Update in-memory state
      setEntries(entries().map(e => 
        e.id === id ? { ...e, archived: false } : e
      ));
    } catch (error) {
      console.error('Failed to restore recording:', error);
    }
  }
/*
  const filtered = createMemo(() => {
    if (!isClient()) return [];
    const q = query().trim().toLowerCase();
    if (!q) return entries();
    return entries().filter(e => e.title.toLowerCase().includes(q));
  });
  */
  const filtered = createMemo(() => {
  const q = query().trim().toLowerCase();
  let list = entries();
  
  // Filter by archive status
  list = list.filter(e => e.archived === showArchived());
  
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
      <Title>{showArchived() ? "Recently Deleted Items" : "Search"}</Title>
      <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
       <ArchiveButton 
        archiveMode={showStarredOnly()} 
        onToggleArchive={() => setShowStarredOnly(!showStarredOnly())}
       />
      </div>
      {mounted() ? (
        <Show when={isClient() && isLoaded()} fallback={<div class="loading">Loading recordings...</div>}>
          <For each={groups()} fallback={<div class="muted">{showArchived() ? 'No recently deleted recordings' : 'No recordings'}</div>}>
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
                      starred={entry.starred}
                      archived={entry.archived}
                      onDelete={handleDelete} 
                      onRename={handleRename}
                      onToggleStar={handleToggleStar}
                      onRestore={handleRestore}
                      isArchiveView={showArchived()}
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