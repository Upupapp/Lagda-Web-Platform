import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { LagdaLoadingProvider } from "./app/services/loading.service";
import { PlatformProvider } from "./app/context/PlatformContext";
import { OnboardingProvider } from "./app/context/OnboardingContext";
import { PendingPreparationProvider } from "./app/context/PendingPreparationContext";
import { BrandToaster } from "./app/components/brand/BrandToast";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <LagdaLoadingProvider>
    <PlatformProvider>
      <OnboardingProvider>
        <PendingPreparationProvider>
          <RouterProvider router={router} />
          <BrandToaster />
        </PendingPreparationProvider>
      </OnboardingProvider>
    </PlatformProvider>
  </LagdaLoadingProvider>
);
