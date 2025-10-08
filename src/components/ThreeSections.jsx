export default function ThreeSections(props) {
  // props.children expected to be [nav, mainContent]
  const children = props.children;
  return (
    <div class="three-sections-root">
      <header class="section top">{children && children[0]}</header>
        <div class="top-left-title">Audio Archive</div>
        {children && children[0]}
      
      <main class="section middle">{children && children[1]}</main>
      <footer class="section bottom">Bottom (1/6)</footer>
    </div>
  );
}