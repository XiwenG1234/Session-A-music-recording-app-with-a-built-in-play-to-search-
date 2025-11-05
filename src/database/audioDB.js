
const indexedDB = typeof window !== 'undefined' 
  ? (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB)
  : null;

let db = null;
let dbReady = false;
let dbInitPromise = null;

function initDB() {
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open("audioDatabase", 1);

    request.onupgradeneeded = function(event) {
      let db = event.target.result;

      if (!db.objectStoreNames.contains("audioFiles")) {
        let objectStore = db.createObjectStore("audioFiles", { keyPath: "id", autoIncrement: true });

        objectStore.createIndex("nameIndex", "name", { unique: false });
        objectStore.createIndex("intervalHashes", "intervalHashes", { unique: false, multiEntry: true });
        objectStore.createIndex("archivedIndex", "archived", { unique: false });
      }
    };

    request.onsuccess = function(event) {
      db = event.target.result;
      dbReady = true;
      resolve(db);
    };

    request.onerror = function(event) {
      console.error("Error opening database", event);
      reject(event.error);
    };
  });
  
  return dbInitPromise;
}

async function waitForDB() {
  if (!dbReady) {
    await initDB();
  }
  return db;
}

async function getStore(mode = "readonly") {
  await waitForDB();
  const tx = db.transaction(["audioFiles"], mode);
  return tx.objectStore("audioFiles");
}

export function addAudio({ blob, name = null, intervalHashes = [] }) {
    return new Promise(async (resolve, reject) => {
        try {
            const store = await getStore("readwrite");
            const data = {
                blob,                 
                name,                 
                intervalHashes,       // interval hashes(once the algorithm is connected)
                timestamp: Date.now(),
                archived: false       // new entries are not archived by default
            };
            const req = store.add(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        } catch (e) {
            reject(e);
        }
    });
}

export function getAllAudio() {
    return new Promise(async (resolve, reject) => {
        try {
            const store = await getStore("readonly");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        } catch (e) {
            reject(e);
        }
    });
}

export function getAudioById(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const store = await getStore("readonly");
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        } catch (e) {
            reject(e);
        }
    });
}

export function updateAudio(id, updates) {
    return new Promise(async (resolve, reject) => {
        try {
            const store = await getStore("readwrite");
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const data = getReq.result;
                if (!data) {
                    reject(new Error("Audio not found"));
                    return;
                }
                const updatedData = { ...data, ...updates };
                const putReq = store.put(updatedData);
                putReq.onsuccess = () => resolve(true);
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        } catch (e) {
            reject(e);
        }
    });
}

export function deleteAudioById(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const store = await getStore("readwrite");
            const req = store.delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        } catch (e) {
            reject(e);
        }
    });
}