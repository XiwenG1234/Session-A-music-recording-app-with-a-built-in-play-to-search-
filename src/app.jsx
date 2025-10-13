import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import ThreeSections from "./components/ThreeSections";
import HeaderBar from "./components/HeaderBar";

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>SolidStart - Basic</Title>
          <ThreeSections>
            <HeaderBar />
            <Suspense>{props.children}</Suspense>
            <div>
              <button className="record-button" aria-label="record">●</button>
            </div>
          </ThreeSections>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

