export function haptic(type: "light" | "selection" | "success" | "warning" | "error") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return;
  const patterns: Record<string, number[]> = {
    light:     [8],
    selection: [12],
    success:   [8, 40, 8],
    warning:   [25, 15, 25],
    error:     [40, 20, 40],
  };
  navigator.vibrate(patterns[type] ?? [10]);
}
