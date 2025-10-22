export default function ArchiveButton(props) {
  function toggleArchive() {
    if (props.onToggleArchive) {
      props.onToggleArchive();
    }
  }

  return (
    <button 
      class={`archive-btn ${props.archiveMode ? 'active' : ''}`} 
      onClick={toggleArchive} 
      aria-label="show starred"
      title={props.archiveMode ? "Show all files" : "Show starred files on top"}
    >
      ★
    </button>
  );
}