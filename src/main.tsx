import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
// oxlint-disable-next-line import/no-unassigned-import -- Vite bundles the global stylesheet.
import "./index.css";

const root = document.querySelector<HTMLDivElement>("#root");
if (root === null) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
