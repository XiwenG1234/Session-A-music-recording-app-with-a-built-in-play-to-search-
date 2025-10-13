import { createSignal, onMount, onCleanup } from "solid-js";

export default function AudioEntry(props) {
  let root;
  const [open, setOpen] = createSignal(false);

  function toggleMenu(e) {
    e.stopPropagation();
    setOpen(!open());
  }

  function handleDownload() {
    if (props.onDownload) {
      props.onDownload(props.id);
    } else {
      // default: download a small placeholder text file
      const blob = new Blob([`Recording: ${props.title}`], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${props.title || "recording"}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    setOpen(false);
  }

  function handleDelete() {
    if (props.onDelete) props.onDelete(props.id);
    else console.log("delete", props.id);
    setOpen(false);
  }

  onMount(() => {
    const onDoc = (e) => {
      if (!root.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    onCleanup(() => document.removeEventListener("click", onDoc));
  });

  return (
    <div class="audio-entry" ref={root}>
      <div class="entry-left">
        <div class="entry-title">{props.title}</div>
        <div class="entry-sub">{props.subtitle || ""}</div>
      </div>

      <div class="entry-right">
        <button class="dots-btn" aria-haspopup="true" aria-expanded={open()} onClick={toggleMenu} aria-label="options">⋯</button>
        {open() && (
          <div class="entry-menu" role="menu">
            <button class="menu-item" onClick={handleDownload} role="menuitem">Download</button>
            <button class="menu-item" onClick={handleDelete} role="menuitem">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}
