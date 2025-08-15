import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Main.tsx loaded");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
} else {
  console.log("Root element found, creating React app");
  try {
    createRoot(rootElement).render(<App />);
    console.log("React app rendered successfully");
  } catch (error) {
    console.error("Error rendering React app:", error);
  }
}
