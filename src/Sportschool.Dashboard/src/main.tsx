import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import trTR from "antd/locale/tr_TR";
import { App } from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      locale={trTR}
      theme={{
        token: {
          colorPrimary: "#14532d",
          borderRadius: 10,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
        }
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>
);
