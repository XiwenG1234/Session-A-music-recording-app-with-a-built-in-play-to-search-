import { Show, For } from "solid-js";
import { searchResults, setSearchResults } from "~/stores/recorder";

export default function SearchResultsModal() {
  const closeModal = () => {
    setSearchResults([]);
  };

  const results = () => searchResults().slice(0, 20);

  return (
    <Show when={searchResults().length > 0}>
      <div class="search-results-overlay" onClick={closeModal}>
        <div class="search-results-dialog" onClick={(e) => e.stopPropagation()}>
          <div class="search-results-header">
            <h2 class="search-results-title">Search Results</h2>
            <p class="search-results-subtitle">
              Found {searchResults().length} match{searchResults().length !== 1 ? 'es' : ''}
              {searchResults().length > 20 ? ' (showing first 20)' : ''}
            </p>
            <button class="search-results-close" onClick={closeModal} aria-label="Close">✕</button>
          </div>

          <div class="search-results-list">
            <For each={results()}>
              {(result) => (
                <div class="search-result-item">
                  <div class="search-result-info">
                    <div class="search-result-name">{result.name}</div>
                    <div class="search-result-meta">
                      <span class="search-result-section">
                        {result.keyStart.toFixed(2)}s - {result.keyEnd.toFixed(2)}s
                      </span>
                      <span class="search-result-score">
                        Score: {result.score.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <div class="search-result-player">
                    <audio
                      controls
                      preload="metadata"
                      src={result.queryUrl}
                    />
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
}
