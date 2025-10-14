import { createSignal } from "solid-js";
import { entries, setEntries } from "~/stores/entries";
import { addToast } from "~/stores/toast";

let mediaRecorder = null;
let mediaStream = null;
let chunks = [];
let startTs = 0;
let timer = null;

const [isRecording, setIsRecording] = createSignal(false);
const [duration, setDuration] = createSignal(0); // seconds
const [lastBlobUrl, setLastBlobUrl] = createSignal(null);

function _tick() {
  setDuration(Math.floor((Date.now() - startTs) / 1000));
}

export async function startRecording() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(mediaStream);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.start();
    startTs = Date.now();
    setDuration(0);
    timer = setInterval(_tick, 250);
    setIsRecording(true);
  } catch (err) {
    console.error('startRecording error', err);
    throw err;
  }
}

export function stopRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    setLastBlobUrl(url);

    const id = Date.now();
    const title = `Recording ${new Date().toLocaleTimeString()}`;
    const date = new Date().toLocaleDateString();
  setEntries([{ id, title, date, blobUrl: url }, ...entries()]);
  addToast('Recording saved');

    // stop all tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    chunks = [];
    if (timer) clearInterval(timer);
    setDuration(0);
    setIsRecording(false);
  };
  mediaRecorder.stop();
  mediaRecorder = null;
}

export { isRecording, duration, lastBlobUrl };
