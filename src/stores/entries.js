import { createSignal } from "solid-js";

const initial = [
  { id: 1, title: "blah #1", date: "9/24" },
  { id: 2, title: "notes", date: "9/24" },
  { id: 3, title: "meeting", date: "6/15" },
];

export const [entries, setEntries] = createSignal(initial);
