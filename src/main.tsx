import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { LagdaLoadingProvider } from "./app/services/loading.service";
import { PlatformProvider } from "./app/context/PlatformContext";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <LagdaLoadingProvider>
    <PlatformProvider>
      <RouterProvider router={router} />
    </PlatformProvider>
  </LagdaLoadingProvider>
);
