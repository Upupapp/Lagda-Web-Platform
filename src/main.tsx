import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { LagdaLoadingProvider } from "./app/services/loading.service";
import { ProcessingProvider } from "./app/services/processing.service";
import { PlatformProvider } from "./app/context/PlatformContext";
import { OnboardingProvider } from "./app/context/OnboardingContext";
import { PendingPreparationProvider } from "./app/context/PendingPreparationContext";
import { BrandToaster } from "./app/components/brand/BrandToast";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <LagdaLoadingProvider>
    {/* Above every route and context, so any of them can report progress. */}
    <ProcessingProvider>
      <PlatformProvider>
        <OnboardingProvider>
          <PendingPreparationProvider>
            <RouterProvider router={router} />
            <BrandToaster />
          </PendingPreparationProvider>
        </OnboardingProvider>
      </PlatformProvider>
    </ProcessingProvider>
  </LagdaLoadingProvider>
);
