// Single toggle point for the Product Tour feature.
// Backed by APP_CONFIG.features.productTour (src/app/config/app.config.ts) so
// it follows the same pattern as every other feature flag in the app.
// When false: TourProvider renders children only — no overlay, no listeners,
// no auto-start, zero behavior change.

import { APP_CONFIG } from "../config/app.config";

export const ENABLE_PRODUCT_TOUR: boolean = APP_CONFIG.features.productTour;
