import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@livekit/components-styles";
import { App } from "./app";
import "./style.css";
const root = document.getElementById("app");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
