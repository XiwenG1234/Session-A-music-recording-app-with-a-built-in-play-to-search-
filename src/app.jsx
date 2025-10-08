import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import ThreeSections from "./components/ThreeSections";

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>SolidStart - Basic</Title>
          <ThreeSections>
            <nav className="top-links">
              <a href="/">Search</a>
              <a href="/about">MyAudio</a>
            </nav>
            <Suspense>{props.children}</Suspense>
          </ThreeSections>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

