import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { UserContextProvider } from "./context/UserContext.jsx";
import { CourseContextProvider } from "./context/CourseContext.jsx";

// Empty VITE_SERVER_URL in Docker/nginx build → same-origin /api and /uploads
export const server =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? "http://localhost:8002" : "");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UserContextProvider>
      <CourseContextProvider>
        <App />
      </CourseContextProvider>
    </UserContextProvider>
  </React.StrictMode>
);
