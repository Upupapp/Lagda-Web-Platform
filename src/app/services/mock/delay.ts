import { APP_CONFIG } from "../../config/app.config";

// Simulate realistic API latency in mock services.
// Replace with no-op when wiring real API: `export const delay = () => Promise.resolve();`
export function delay(ms?: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms ?? APP_CONFIG.mockDelayMs)
  );
}
