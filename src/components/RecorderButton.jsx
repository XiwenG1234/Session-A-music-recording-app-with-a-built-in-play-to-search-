import { createSignal, onCleanup } from "solid-js";
import { startRecording, stopRecording, isRecording, duration } from "~/stores/recorder";

export default function RecorderButton() {
  const [, setTick] = createSignal(0);

  function toggle() {
    if (isRecording()) stopRecording();
    else startRecording();
    setTick(t => t + 1);
  }

  // re-render every 250ms to update duration display
  const iv = setInterval(() => setTick(t => t + 1), 250);
  onCleanup(() => clearInterval(iv));

  return (
    <div class="record-wrapper">
      <button
        class={`record-button ${isRecording() ? 'recording' : ''}`}
        onClick={toggle}
        aria-pressed={isRecording()}
      >
        ●
      </button>
      {isRecording() && <div class="recording-indicator">{String(duration())}s</div>}
    </div>
  );
}
