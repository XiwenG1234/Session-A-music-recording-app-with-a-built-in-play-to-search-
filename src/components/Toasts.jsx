import { toasts } from "~/stores/toast";

export default function Toasts() {
  return (
    <div class="toasts-root">
      {toasts().map(t => (
        <div class="toast">{t.message}</div>
      ))}
    </div>
  );
}
