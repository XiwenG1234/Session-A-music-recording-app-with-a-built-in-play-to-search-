# Audio Cutting Feature Implementation Guide

## Overview
This guide explains how to add the audio cutting feature to your Session web app. The feature allows users to remove specific time segments from audio files and create new versions.

## Files Created

### 1. AudioCutter.jsx
- **Location**: `src/components/AudioCutter.jsx`
- **Purpose**: Main component for the cutting interface
- **Features**:
  - Input fields for start and end times (MM:SS or HH:MM:SS format)
  - Validates time inputs
  - Uses Web Audio API to process audio
  - Removes specified segment and joins remaining parts
  - Generates versioned filenames (e.g., "Recording (1)", "Recording (2)")
  - Converts result to WAV format
  - Saves to IndexedDB

### 2. AudioEntry.jsx (Updated)
- **Location**: `src/components/AudioEntry.jsx`
- **Changes**:
  - Added "Cut" button to the menu
  - Added state for showing/hiding the cutter dialog
  - Imported and integrated AudioCutter component

### 3. audio-cutter.css
- **Location**: `src/styles/audio-cutter.css` (or add to your main CSS file)
- **Purpose**: Styles for the cutting dialog
- **Features**:
  - Modal overlay with backdrop blur
  - Smooth animations
  - Responsive design
  - Consistent with your app's design system

## Installation Steps

### Step 1: Add Components
1. Copy `AudioCutter.jsx` to `src/components/AudioCutter.jsx`
2. Replace your existing `AudioEntry.jsx` with the updated version

### Step 2: Add Styles
Add the CSS from `audio-cutter.css` to your main CSS file (`src/app.css`) or import it separately.

If importing separately, add this to your `app.css`:
```css
@import './audio-cutter.css';
```

### Step 3: Verify Dependencies
Make sure these are already in your project (they should be):
- Web Audio API (built into browsers)
- Your existing database functions (`addAudio`, `getAudioById`)
- Your existing stores (`entries`, `setEntries`, `addToast`)

## How It Works

### User Flow
1. User clicks the "⋯" menu button on any audio entry
2. Clicks "Cut" from the menu
3. Modal dialog opens with two time input fields
4. User enters start and end times (e.g., "00:23" to "00:45")
5. User clicks "Cut Audio"
6. App processes the audio:
   - Loads the audio file
   - Decodes it using Web Audio API
   - Removes the specified segment
   - Joins the remaining parts
   - Converts to WAV format
7. New file is saved with versioned name
8. Toast notification confirms success
9. New audio appears at the top of the list

### Technical Details

**Time Format Parsing**:
- Accepts `MM:SS` (e.g., "01:30" = 1 minute 30 seconds)
- Accepts `HH:MM:SS` (e.g., "1:01:30" = 1 hour 1 minute 30 seconds)

**Audio Processing**:
1. Fetches the audio blob
2. Converts to ArrayBuffer
3. Decodes using AudioContext
4. Creates new buffer with length = original - cut segment
5. Copies data before cut point
6. Copies data after cut point (skipping the cut segment)
7. Converts back to WAV blob

**Versioning**:
- Automatically detects existing versions
- Increments version number: "Recording" → "Recording (1)" → "Recording (2)"
- Prevents duplicate names

## Usage Examples

### Example 1: Remove Introduction
**Original audio**: 3 minutes long with 23-second intro
- Input: Start: `00:00`, End: `00:23`
- Result: 2:37 long, intro removed

### Example 2: Remove Middle Section
**Original audio**: 5 minutes with 1-minute mistake at 2:30
- Input: Start: `02:30`, End: `03:30`
- Result: 4 minutes long, mistake removed

### Example 3: Remove Ending
**Original audio**: 10 minutes with 45 seconds of silence at end
- Input: Start: `09:15`, End: `10:00`
- Result: 9:15 long, silence removed

## Browser Compatibility

The Web Audio API is supported in all modern browsers:
- ✅ Chrome/Edge 14+
- ✅ Firefox 25+
- ✅ Safari 6+
- ✅ Opera 15+

## Performance Notes

- Processing time depends on audio length
- A 5-minute audio file typically processes in 1-2 seconds
- Longer files may take more time
- Processing happens on the main thread (may briefly freeze UI for very long files)

## Potential Enhancements

### Future Improvements:
1. **Visual Timeline**: Show waveform and allow visual selection
2. **Preview**: Listen to cut result before saving
3. **Multiple Cuts**: Remove multiple segments in one operation
4. **Format Options**: Choose output format (MP3, WAV, etc.)
5. **Undo/Redo**: Revert cutting operations
6. **Keyboard Shortcuts**: Quick cut operations
7. **Audio Player Integration**: Set cut points while playing

## Troubleshooting

### Issue: "Invalid time format" error
**Solution**: Ensure times are in MM:SS or HH:MM:SS format with numbers only

### Issue: "Start time must be before end time"
**Solution**: Verify that the start time is less than the end time

### Issue: "Failed to cut audio"
**Possible causes**:
- Audio file not loaded properly
- Insufficient memory for large files
- Browser doesn't support Web Audio API
- Times exceed audio duration

### Issue: Processing takes too long
**Solution**: 
- For very long audio files, consider implementing Web Workers
- Add progress indicator for better UX

## Testing Checklist

- [ ] Can open cut dialog from menu
- [ ] Can enter valid time formats
- [ ] Shows error for invalid formats
- [ ] Shows error when start >= end
- [ ] Successfully cuts audio
- [ ] New file has versioned name
- [ ] Original file remains unchanged
- [ ] Toast notification appears
- [ ] Can close dialog with Cancel button
- [ ] Can close dialog by clicking outside
- [ ] Processing indicator shows while working

## Code Structure

```
AudioCutter Component
├── Time Parsing (parseTimeToSeconds)
├── Audio Processing (handleCut)
│   ├── Fetch audio blob
│   ├── Decode audio
│   ├── Create new buffer
│   ├── Copy audio data (excluding cut segment)
│   └── Convert to WAV
├── Versioning (generateVersionedTitle)
└── WAV Conversion (audioBufferToWav)
```

## Notes

- The cut operation is non-destructive; original files remain unchanged
- All new files are saved as WAV format for maximum compatibility
- File size may increase after cutting (WAV is uncompressed)
- Consider adding MP3 encoding in the future for smaller file sizes

## Support

If you encounter any issues:
1. Check browser console for error messages
2. Verify audio file is properly loaded
3. Ensure times are within audio duration
4. Test with shorter audio files first
