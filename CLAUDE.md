# CLAUDE.md - AI Assistant Development Guide

## Project Overview

**Project Name:** Session A - Music Recording App with Play-to-Search
**Type:** Web-based Audio Recording & Management Application
**Framework:** SolidJS + SolidStart (Full-stack reactive framework)
**Build Tool:** Vinxi (Vite-based)
**Storage:** IndexedDB (Browser-native NoSQL database)

### Core Features

1. **Audio Recording** - Real-time recording using MediaRecorder API
2. **Audio Management** - Create, rename, star, archive, delete recordings
3. **Audio Editing** - Cut/trim audio segments with time-based selection
4. **File Upload** - Import existing audio files (mp3, wav, ogg, m4a, aac, flac, webm, opus)
5. **Search** - Real-time filter recordings by title
6. **Archive System** - Soft delete with "Recently Deleted" view and restore capability
7. **Starred Recordings** - Mark favorites (future: filter view)
8. **Play-to-Search** - Placeholder for future "Shazam-like" audio recognition
9. **Toast Notifications** - User feedback for actions
10. **Persistent Storage** - All recordings saved to browser IndexedDB

---

## Tech Stack

### Core Dependencies
```json
{
  "solid-js": "^1.9.5",           // Reactive UI framework
  "@solidjs/start": "^1.1.0",     // Full-stack meta-framework (SSR/SSG)
  "@solidjs/router": "^0.15.0",   // File-based routing
  "@solidjs/meta": "^0.29.4",     // Document head management
  "vinxi": "^0.5.7"               // Build tool and dev server
}
```

### Browser APIs Used
- **MediaRecorder API** - Audio recording
- **Web Audio API** - Audio processing and cutting (AudioContext, decodeAudioData)
- **IndexedDB** - Client-side database storage
- **Blob API** - Binary data handling and URL generation

### Requirements
- Node.js >= 22
- Modern browser with Web Audio API support (Chrome/Edge 14+, Firefox 25+, Safari 6+, Opera 15+)

---

## Codebase Structure

```
/
├── public/                       # Static assets
│   └── favicon.ico
├── src/
│   ├── components/              # Reusable UI components (11 files)
│   │   ├── ArchiveButton.jsx       # "Recently Deleted" toggle with badge
│   │   ├── AudioCutter.jsx         # Audio editing modal dialog
│   │   ├── AudioEntry.jsx          # Individual recording list item
│   │   ├── Counter.jsx             # Example counter component
│   │   ├── FileUpload.jsx          # File import button
│   │   ├── HeaderBar.jsx           # Top navigation/search bar
│   │   ├── RecorderButton.jsx      # Main recording button (footer)
│   │   ├── ThreeSections.jsx       # Layout wrapper (header/main/footer)
│   │   └── Toasts.jsx              # Notification display system
│   ├── database/                # Data persistence layer
│   │   └── audioDB.js              # IndexedDB wrapper with CRUD operations
│   ├── routes/                  # Page routes (file-based routing)
│   │   ├── index.jsx               # Home page (main app view)
│   │   ├── about.jsx               # About page
│   │   └── [...404].jsx            # 404 catch-all
│   ├── stores/                  # Global state management (4 stores)
│   │   ├── entries.js              # Audio recordings state
│   │   ├── recorder.js             # Recording state & MediaRecorder logic
│   │   ├── search.js               # Search query state
│   │   └── toast.js                # Toast notifications state
│   ├── app.jsx                  # Root app component with layout
│   ├── app.css                  # Global styles (959 lines)
│   ├── entry-client.jsx         # Client-side entry point
│   ├── entry-server.jsx         # Server-side entry point
│   └── global.d.js              # Type definitions
├── app.config.js                # SolidStart configuration
├── jsconfig.json                # JavaScript compiler options + path aliases
├── package.json                 # Dependencies and scripts
└── README.md                    # Project documentation
```

---

## Key Components & Functionality

### AudioEntry.jsx (341 lines)
**Purpose:** Individual recording display with full management capabilities

**Key Features:**
- Audio player with controls (play, pause, download, speed)
- Star/unstar toggle with visual feedback
- Inline rename with keyboard shortcuts (Enter to save, Escape to cancel)
- Context menu with options: Rename, Cut, Delete/Archive
- Archive view: Shows Restore and Delete Permanently
- Lazy-loads audio blob URLs from IndexedDB
- Manages blob URL lifecycle with proper cleanup

**Props:**
```javascript
{
  id: number,           // Entry ID
  title: string,        // Recording name
  date: string,         // Display date
  dbId: number,         // IndexedDB primary key
  starred: boolean,     // Favorite status
  archived: boolean     // Soft delete status
}
```

**Important Patterns:**
- Uses `createEffect` to load blob URL from IndexedDB on mount
- Cleans up blob URLs with `onCleanup(() => URL.revokeObjectURL(blobUrl))`
- Event propagation control with `e.stopPropagation()`
- Two-way sync with IndexedDB (updates persist immediately)

### AudioCutter.jsx (300 lines)
**Purpose:** Modal dialog for audio editing/trimming

**Key Features:**
- Time input fields supporting MM:SS or HH:MM:SS format
- Validates time ranges (start < end, within audio duration)
- Uses Web Audio API for processing:
  1. Decodes audio to AudioBuffer
  2. Removes specified segment (or keeps only segment)
  3. Re-encodes to WAV format
- Automatic version numbering: "Recording" → "Recording (1)" → "Recording (2)"
- Error handling with animated error popups
- Processing state with disabled controls during operations

**Audio Processing Flow:**
```javascript
1. Fetch audio blob from URL
2. Convert to ArrayBuffer
3. Decode to AudioBuffer using AudioContext
4. Create new buffer with desired segment
5. Encode to WAV format
6. Save to IndexedDB
7. Update UI state
```

### HeaderBar.jsx (72 lines)
**Purpose:** Top navigation with search and actions

**Components:**
- Search input with real-time query sync
- Clear button (appears when query exists)
- "Shazam" button for play-to-search feature (placeholder)
- File upload button
- "Recently Deleted" toggle with badge count

### RecorderButton.jsx (30 lines)
**Purpose:** Main recording control in footer

**Features:**
- Large circular button with visual state
- Shows recording duration in real-time (MM:SS format)
- Toggles recording on/off
- Pulsing animation when recording active

### FileUpload.jsx (88 lines)
**Purpose:** Import existing audio files

**Features:**
- Hidden file input with custom button trigger
- Accepts multiple files
- Filters for valid audio formats: mp3, wav, ogg, m4a, aac, flac, webm, opus
- Batch upload support
- Auto-naming: Uses filename or generates from timestamp

### ThreeSections.jsx (22 lines)
**Purpose:** Layout component for consistent page structure

**Structure:**
```jsx
<div class="three-sections">
  <header>{props.header}</header>
  <main>{props.children}</main>
  <footer>{props.footer}</footer>
</div>
```

### Toasts.jsx (12 lines)
**Purpose:** Display notification messages

**Features:**
- Stacked display for multiple toasts
- Auto-dismisses after 3 seconds
- Simple reactive render from toast store

---

## State Management

**Architecture:** Signal-based reactive state (SolidJS signals)

### entries.js Store
**Purpose:** Manage array of audio recordings

**Signals:**
```javascript
const [entries, setEntries] = createSignal([])
const [isLoaded, setIsLoaded] = createSignal(false)
const [isClient, setIsClient] = createSignal(false)
const [showArchived, setShowArchived] = createSignal(false)
```

**Entry Structure:**
```javascript
{
  id: number,           // Display ID
  title: string,        // Recording name
  date: string,         // Formatted display date
  blobUrl: string | null, // Lazy-loaded blob URL
  dbId: number,         // IndexedDB primary key
  timestamp: number,    // Unix timestamp
  starred: boolean,     // Favorite flag
  archived: boolean     // Soft delete flag
}
```

**Initialization:**
- Loads from IndexedDB on mount (client-side only)
- SSR-safe with `typeof window` check
- Maps DB records to UI-friendly entry objects
- Handles loading states for async operations

### recorder.js Store
**Purpose:** Manage recording state and MediaRecorder instance

**Signals:**
```javascript
const [isRecording, setIsRecording] = createSignal(false)
const [duration, setDuration] = createSignal(0)
const [lastBlobUrl, setLastBlobUrl] = createSignal(null)
```

**Key Functions:**
- `startRecording()` - Requests microphone, starts MediaRecorder, begins timer
- `stopRecording()` - Stops recording, saves to IndexedDB, cleans up stream
- Timer updates duration every 250ms during recording
- Automatic cleanup of media streams on stop

**MediaRecorder Configuration:**
```javascript
mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm' // or browser-supported format
})
```

### search.js Store
**Purpose:** Shared search query state

**Signals:**
```javascript
const [query, setQuery] = createSignal("")
```

**Usage:**
- Updated by HeaderBar search input
- Consumed by routes to filter entries
- Real-time reactive filtering

### toast.js Store
**Purpose:** Queue of notification messages

**Signals:**
```javascript
const [toasts, setToasts] = createSignal([])
```

**API:**
```javascript
function addToast(message) {
  const id = Date.now()
  setToasts([...toasts(), { id, message }])
  setTimeout(() => removeToast(id), 3000)
}

function removeToast(id) {
  setToasts(toasts().filter(t => t.id !== id))
}
```

---

## Database/Storage Architecture

### IndexedDB Schema

**Database:** `audioDatabase`
**Version:** 1
**Object Store:** `audioFiles`

**Schema:**
```javascript
{
  id: number,              // Auto-increment primary key
  blob: Blob,              // Audio file binary data
  name: string,            // Recording name
  intervalHashes: Array,   // FUTURE: Audio fingerprints for play-to-search
  timestamp: number,       // Creation timestamp (Unix time)
  archived: boolean,       // Soft delete flag
  starred: boolean         // Favorite flag
}
```

**Indexes:**
- `nameIndex` - on `name` field (for future search optimization)
- `intervalHashes` - multi-entry index (for future audio fingerprinting)
- `archivedIndex` - on `archived` field (efficient archive filtering)

### Database API (audioDB.js)

**Functions:**
```javascript
// Initialize database connection (lazy, promise-cached)
initDB(): Promise<IDBDatabase>

// Create new recording
addAudio({ blob, name, intervalHashes }): Promise<number>

// Read all recordings
getAllAudio(): Promise<Array<AudioFile>>

// Read single recording
getAudioById(id): Promise<AudioFile | undefined>

// Update recording (partial)
updateAudio(id, updates): Promise<void>

// Delete recording permanently
deleteAudioById(id): Promise<void>
```

**Key Patterns:**
- SSR-safe: Checks for `window` before accessing IndexedDB
- Promise-based async API
- Lazy initialization with promise caching (avoid multiple init calls)
- Transaction management with proper success/error handlers
- Partial updates with object spread: `{ ...existing, ...updates }`

**Example Update:**
```javascript
await updateAudio(dbId, { starred: true, name: "New Name" })
```

---

## Routing

**System:** File-based routing via @solidjs/router

### Routes

| Path | File | Description |
|------|------|-------------|
| `/` | `src/routes/index.jsx` | Home page (main app) |
| `/about` | `src/routes/about.jsx` | About page |
| `*` | `src/routes/[...404].jsx` | 404 catch-all |

### Route Structure

**Root Layout (app.jsx):**
```jsx
<Router root={props => (
  <MetaProvider>
    <ThreeSections
      header={<HeaderBar />}
      footer={<RecorderButton />}
    >
      <Suspense>{props.children}</Suspense>
    </ThreeSections>
    <Toasts />
  </MetaProvider>
)}>
  <FileRoutes />
</Router>
```

**Persistent Elements:**
- HeaderBar (search, upload, archive toggle)
- RecorderButton (footer)
- Toasts (global notifications)

**Path Alias:**
```javascript
"~/*" → "./src/*"  // Configured in jsconfig.json
```

**Example Imports:**
```javascript
import { entries } from "~/stores/entries"
import AudioEntry from "~/components/AudioEntry"
```

---

## Development Workflow

### Scripts

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:3000)
npm run dev -- --open    # Start dev server and open browser
npm run build            # Production build
npm start                # Start production server
npm run version          # Show version info
```

### Development Server

- **Port:** http://localhost:3000 (default)
- **Hot Module Replacement (HMR):** Instant updates during development
- **SSR:** Server-side rendering for initial page load
- **File watching:** Auto-reload on file changes

### Build Output

Build artifacts are generated in:
- `.vinxi/` - Build cache (gitignored)
- `.output/` - Production output (gitignored)
- `dist/` - Distribution files (gitignored)

### Configuration Files

- **app.config.js** - SolidStart config (currently uses defaults)
- **jsconfig.json** - Path aliases and JSX config
- **.gitignore** - Excludes build artifacts, node_modules, env files

---

## Code Conventions & Best Practices

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase + .jsx | `AudioEntry.jsx`, `RecorderButton.jsx` |
| Stores | camelCase + .js | `recorder.js`, `entries.js` |
| Database functions | camelCase + verb prefix | `addAudio()`, `deleteAudioById()` |
| CSS classes | kebab-case | `audio-entry`, `record-button` |
| Event handlers | `handle` prefix | `handleDelete`, `handleRename` |
| Callback props | `on` prefix | `onDelete`, `onRename` |
| Signals | `[value, setValue]` | `[isRecording, setIsRecording]` |

### SolidJS Patterns

**Signal Pattern:**
```javascript
const [value, setValue] = createSignal(initialValue)

// Read
const current = value()

// Write
setValue(newValue)
setValue(prev => prev + 1) // Functional update
```

**Memo for Derived State:**
```javascript
const filteredEntries = createMemo(() => {
  return entries().filter(e =>
    e.title.toLowerCase().includes(query().toLowerCase())
  )
})
```

**Effects for Side Effects:**
```javascript
createEffect(() => {
  const url = value()
  // Runs when value changes

  onCleanup(() => {
    // Cleanup on next run or unmount
  })
})
```

**Props Access:**
```javascript
export default function Component(props) {
  // Access as props.id, props.title
  // Do NOT destructure - breaks reactivity!

  return <div>{props.title}</div>
}
```

### Event Handling

**Stop Propagation:**
```javascript
function handleClick(e) {
  e.stopPropagation()  // Prevent bubbling to parent
  // Handle event
}
```

**Keyboard Events:**
```javascript
function handleKeyDown(e) {
  if (e.key === 'Enter') {
    handleSubmit()
  } else if (e.key === 'Escape') {
    handleCancel()
  }
}
```

### Async Patterns

**Try-Catch with Error Handling:**
```javascript
try {
  await someAsyncOperation()
  addToast("Success message")
} catch (error) {
  console.error('Operation failed:', error)
  addToast("Error message")
}
```

**SSR-Safe Browser API Checks:**
```javascript
if (typeof window !== 'undefined') {
  // Browser-only code
  onMount(() => {
    // Runs only on client
  })
}
```

### Styling Patterns

**CSS Variables (app.css):**
```css
:root {
  --accent: #3B82F6;
  --text: #1e293b;
  --background: #ffffff;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  /* ... more variables */
}
```

**Component Styles:**
- Use semantic class names: `.audio-entry`, `.record-button`
- Hover states with `transform` + `box-shadow` for depth
- Consistent transitions: `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Responsive with media queries: `@media (max-width: 768px)`

**Modern Effects:**
```css
.component {
  box-shadow: var(--shadow-md);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.component:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}
```

### File Organization

- One component per file
- Co-located styles when component-specific (e.g., `Counter.jsx` + `Counter.css`)
- Global styles in `app.css`
- Stores export named exports, not default exports
- Use path aliases for imports: `~/components` vs `../../components`

---

## Common Tasks & Workflows

### Adding a New Recording Feature

1. **Update IndexedDB Schema (if needed):**
   - Edit `src/database/audioDB.js`
   - Increment database version
   - Add upgrade handler in `initDB()`

2. **Add Database Function:**
   ```javascript
   export async function updateFeature(id, value) {
     const db = await initDB()
     // Implementation
   }
   ```

3. **Update Entry Store:**
   - Add new signal or update entry structure
   - Update mapping in `onMount` callback

4. **Update UI Component:**
   - Add UI controls in `AudioEntry.jsx`
   - Add event handlers
   - Update IndexedDB on change

5. **Test Workflow:**
   - Create new recording
   - Verify feature works
   - Refresh page to test persistence

### Adding a New Component

1. **Create Component File:**
   ```bash
   # Create in src/components/
   touch src/components/NewFeature.jsx
   ```

2. **Component Template:**
   ```javascript
   import { createSignal } from "solid-js"

   export default function NewFeature(props) {
     const [state, setState] = createSignal(initialValue)

     return (
       <div class="new-feature">
         {/* JSX */}
       </div>
     )
   }
   ```

3. **Add Styles:**
   - Add to `app.css` or create `NewFeature.css`
   - Use CSS variables for theming

4. **Import and Use:**
   ```javascript
   import NewFeature from "~/components/NewFeature"

   <NewFeature prop1={value} onAction={handler} />
   ```

### Modifying State Management

1. **Create New Store:**
   ```javascript
   // src/stores/newStore.js
   import { createSignal } from "solid-js"

   const [value, setValue] = createSignal(initialValue)

   export { value, setValue }
   ```

2. **Import in Components:**
   ```javascript
   import { value, setValue } from "~/stores/newStore"
   ```

3. **Update Reactively:**
   - Reads: `value()`
   - Writes: `setValue(newValue)`

### Working with Audio Files

**Loading from IndexedDB:**
```javascript
const dbRecord = await getAudioById(dbId)
const url = URL.createObjectURL(dbRecord.blob)

// Use URL in audio element
<audio src={url} />

// Cleanup when done
onCleanup(() => URL.revokeObjectURL(url))
```

**Saving to IndexedDB:**
```javascript
const blob = new Blob([audioData], { type: 'audio/wav' })
const id = await addAudio({
  blob,
  name: "Recording Name",
  intervalHashes: []
})
```

**Audio Processing (Web Audio API):**
```javascript
const audioContext = new AudioContext()
const arrayBuffer = await blob.arrayBuffer()
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

// Process audioBuffer
// ...

// Create new blob
const wavBlob = encodeWAV(audioBuffer)
```

### Debugging Tips

**Console Logging:**
- Check browser console for IndexedDB operations
- Store files include detailed logging (e.g., `entries.js:14`)

**IndexedDB Inspection:**
- Chrome DevTools → Application → Storage → IndexedDB → audioDatabase
- View records, schemas, and data

**Component State:**
```javascript
createEffect(() => {
  console.log('State changed:', value())
})
```

**Network:**
- Ensure development server is running: `npm run dev`
- Check for CORS issues if loading external resources

---

## Important Notes for AI Assistants

### Critical Guidelines

1. **Always Read Before Edit:**
   - NEVER propose changes to code you haven't read
   - Read the entire file before making modifications
   - Understand existing patterns before adding new code

2. **SSR Safety:**
   - Always check `typeof window !== 'undefined'` before using browser APIs
   - Use `onMount` for client-only code
   - Test that code works with SSR (server-side rendering)

3. **Reactivity Rules:**
   - DO NOT destructure props: `const { title } = props` ❌
   - Access props directly: `props.title` ✅
   - Always call signals to read: `value()` not `value`
   - Use functional updates for state: `setValue(prev => prev + 1)`

4. **Memory Management:**
   - Always revoke blob URLs: `URL.revokeObjectURL(url)`
   - Use `onCleanup` in effects for cleanup
   - Close IndexedDB connections when done

5. **IndexedDB Patterns:**
   - Always use the provided `audioDB.js` functions
   - Don't access IndexedDB directly unless necessary
   - Handle async operations with try-catch
   - Keep UI and DB in sync (update both on changes)

6. **Avoid Over-Engineering:**
   - Make minimal changes for the requested feature
   - Don't refactor unrelated code
   - Don't add comments/docs unless clearly needed
   - Keep solutions simple and focused

7. **Event Handling:**
   - Use `e.stopPropagation()` to prevent bubbling when needed
   - Always handle edge cases (empty input, invalid data)
   - Provide user feedback via toast notifications

8. **Testing Changes:**
   - Test recording functionality after changes
   - Verify IndexedDB persistence (refresh page)
   - Check SSR compatibility (build and run production)
   - Test on multiple browsers if modifying audio features

### Common Pitfalls

❌ **Bad:**
```javascript
// Destructuring props (breaks reactivity)
const { title } = props

// Reading signal without calling
if (isRecording) { }

// Direct IndexedDB access
const request = indexedDB.open('audioDatabase')
```

✅ **Good:**
```javascript
// Access props directly
props.title

// Call signal to read
if (isRecording()) { }

// Use provided API
await getAudioById(id)
```

### File-Specific Notes

**AudioEntry.jsx:**
- Most complex component - modify carefully
- Handles multiple states: playing, editing, renaming
- Event bubbling can cause issues - use stopPropagation

**AudioCutter.jsx:**
- Audio processing is CPU-intensive - show loading states
- Validate time inputs carefully
- Handle errors gracefully (corrupted audio, unsupported formats)

**audioDB.js:**
- Database schema changes require version increment
- Add upgrade handlers for migrations
- Test with existing data in browser

**stores/entries.js:**
- Loading happens once on mount - refresh to reload
- SSR-safe initialization is critical
- Mapping from DB to UI format happens here

**stores/recorder.js:**
- MediaRecorder API varies by browser
- Clean up streams to prevent memory leaks
- Timer interval should be cleared on stop

### Security Considerations

- No sensitive data is stored (local-only app)
- User-provided filenames are sanitized by browser
- Blob URLs are scoped to origin
- No external API calls (currently)

### Performance Tips

- Lazy-load blob URLs in AudioEntry (don't load all at once)
- Use memos for expensive filtering operations
- Limit number of simultaneous audio players
- Consider virtualization for long lists (future enhancement)

---

## Git Workflow

### Branch Strategy

**Current Branch:** `claude/claude-md-mic3any6magos6n2-01AEbF3b9eDsTzypkTRL5bMD`

**Branch Naming Convention:**
- Feature branches: `claude/<session-id>`
- All development on feature branches
- Never push directly to main

### Git Operations

**Push Changes:**
```bash
# Always use -u flag for first push
git push -u origin claude/<branch-name>

# Branch must start with 'claude/' and match session ID
# Otherwise push fails with 403 error
```

**Commit Messages:**
```bash
# Good commit messages (from history)
git commit -m "Add 'cut' function that allows users to do some basic edditing to their audio files"
git commit -m "Change 'Archived' to 'Recently Deleted'"
git commit -m "Fix authentication bug in login flow"

# Be descriptive but concise
# Focus on what and why, not how
```

**Common Git Tasks:**
```bash
# Check status
git status

# View changes
git diff

# Stage changes
git add .

# Commit
git commit -m "Descriptive message"

# Push
git push -u origin <branch-name>

# View history
git log --oneline --graph --all --decorate
```

### Commit Best Practices

1. Make atomic commits (one logical change per commit)
2. Write clear, descriptive commit messages
3. Test before committing
4. Don't commit build artifacts (already in .gitignore)
5. Don't commit environment files (.env)

### Recent Development History

Recent features added (from git log):
- Audio cutting/editing functionality
- Archive and restore system (rebranded to "Recently Deleted")
- Star/favorite functionality with persistence
- IndexedDB integration for persistent storage
- Upload functionality for existing files
- UI enhancements and polish

---

## Future Enhancements

Based on codebase analysis, these features are planned or partially implemented:

1. **Play-to-Search (Audio Fingerprinting):**
   - `intervalHashes` field in database schema
   - `intervalHashes` index created
   - "Shazam" button in header (placeholder)
   - Need: Audio fingerprinting algorithm, matching service

2. **Starred Recordings Filter:**
   - Star functionality fully implemented
   - Missing: Filter to show only starred recordings
   - `ArchiveButton.jsx` could be refactored to generic filter button

3. **Advanced Search:**
   - Current: Simple substring match on title
   - Future: Search by date, duration, tags
   - `nameIndex` exists in database for optimization

4. **Export/Share:**
   - Currently: Individual download via audio player
   - Future: Batch export, share to cloud, export metadata

5. **Recording Settings:**
   - Format selection (wav, mp3, ogg)
   - Quality/bitrate settings
   - Microphone selection

6. **Waveform Visualization:**
   - Display waveform for recordings
   - Visual feedback during recording
   - Scrubbing/seeking via waveform

---

## Quick Reference

### File Paths
```
Components: ~/components/ComponentName.jsx
Stores: ~/stores/storeName.js
Database: ~/database/audioDB.js
Routes: ~/routes/path.jsx
```

### Common Imports
```javascript
import { createSignal, createEffect, createMemo, onMount, onCleanup } from "solid-js"
import { entries, setEntries } from "~/stores/entries"
import { isRecording, startRecording, stopRecording } from "~/stores/recorder"
import { query, setQuery } from "~/stores/search"
import { addToast } from "~/stores/toast"
import { addAudio, getAllAudio, updateAudio, deleteAudioById } from "~/database/audioDB"
```

### Development URLs
- Dev server: http://localhost:3000
- IndexedDB: Chrome DevTools → Application → IndexedDB
- Console: Chrome DevTools → Console

---

## Questions or Issues?

If you encounter issues or need clarification:

1. Read the relevant component/store file
2. Check browser console for errors
3. Inspect IndexedDB in DevTools
4. Review recent git commits for context
5. Test in isolation before integrating

**Remember:** This is a modern, reactive SolidJS application. Understanding signals, effects, and the reactive system is crucial for making effective changes.

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0
**Maintained by:** AI Assistants working on Session A
