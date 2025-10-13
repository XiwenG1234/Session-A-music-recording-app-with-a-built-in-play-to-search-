import { children as getChildren } from "solid-js";

export default function ThreeSections(props) {
  const c = getChildren(() => props.children);
  const resolved = c();
  const nav = Array.isArray(resolved) ? resolved[0] : resolved;
  const main = Array.isArray(resolved) ? resolved[1] : null;
  const footer = Array.isArray(resolved) ? resolved[2] : null;

  return (
    <div class="three-sections-root">
      <header class="section top">{nav}</header>
      <div class="top-left-title">Session</div>
      <main class="section middle">
        <div class="middle-inner">{main}</div>
      </main>
      <footer class="section bottom">{footer}</footer>
    </div>
  );
}