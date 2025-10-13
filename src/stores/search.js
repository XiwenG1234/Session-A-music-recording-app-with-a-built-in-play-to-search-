import { createSignal } from "solid-js";

// shared search query signal used by HeaderBar and routes
export const [query, setQuery] = createSignal("");
