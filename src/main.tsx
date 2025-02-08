import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import { Provider } from "./provider.tsx";
import "@/styles/globals.css";
import NotificationProvider from "./components/notifications/Notification.tsx";
import VantaBackground from "./components/VantaBackground.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <Provider>
          <VantaBackground />
          <App />
        </Provider>
      </NotificationProvider>
    </BrowserRouter>
  </React.StrictMode>
);
