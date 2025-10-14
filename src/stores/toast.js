import { createSignal } from "solid-js";

const [toasts, setToasts] = createSignal([]);
let idCounter = 0;

export function addToast(message, { duration = 3000 } = {}) {
  const id = ++idCounter;
  setToasts(t => [{ id, message }, ...t]);
  setTimeout(() => {
    setToasts(t => t.filter(x => x.id !== id));
  }, duration);
  return id;
}

export function removeToast(id) {
  setToasts(t => t.filter(x => x.id !== id));
}

export { toasts };
