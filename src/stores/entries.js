import { createSignal, onMount } from "solid-js";
import { getAllAudio } from "~/database/audioDB";

const [entries, setEntries] = createSignal([]);
const [isLoaded, setIsLoaded] = createSignal(false);
const [isClient, setIsClient] = createSignal(false);

if (typeof window !== 'undefined') {
  onMount(async () => {
    setIsClient(true);
    try {
      console.log('Loading recordings from IndexedDB...');
      const audioFiles = await getAllAudio();
      console.log('Retrieved', audioFiles.length, 'recordings from IndexedDB:', audioFiles);
      
      const loadedEntries = audioFiles.map(file => ({
        id: file.id,
        title: file.name || `Recording ${new Date(file.timestamp).toLocaleTimeString()}`,
        date: new Date(file.timestamp).toLocaleDateString(),
        blobUrl: null,
        dbId: file.id,
        timestamp: file.timestamp,
        starred: file.starred || false
      }));
      
      console.log('Mapped entries:', loadedEntries);
      setEntries(loadedEntries);
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load recordings:', error);
      setIsLoaded(true);
    }
  });
} else {
  setIsClient(false);
  setIsLoaded(true);
}

export { entries, setEntries, isLoaded, isClient };
