// The signed-in app's backdrop: soft, translucent waves in three corners (top
// right, bottom left, bottom right) that fade to nothing towards the middle,
// so the centre, where the work is, stays calm.
//
// Sky blue carries the waves, over a faint navy depth layer (a slightly larger
// shape, drawn first, that shows as a quiet rim). A normal blue runs along the
// very edge of the section, where each wave begins, drawn last so it reads as
// the wave's deepest part. Decorative and
// still; hidden from assistive technology, from the pointer, in forced
// colours and in print.
//
// Two places use it, each mounted once by a shared signed-in shell:
//   "page" (default)  the main area beside the sidebar and under the header,
//                     on a pale wash. Its content sits above it.
//   "side"            the white side panel: the same waves, smaller and with no
//                     wash, behind the panel's own content (z-index -1 inside
//                     the panel's stacking context).
// Colours, strengths and sizes: the --app-wave-* tokens and .app-wave* rules
// in styles/app-shell.css.
//
// `fixed`: pinned to the window, for a shell whose page scrolls the window (the
// eNotary shell, the public site). Otherwise it fills its nearest positioned
// parent, which the shell keeps from scrolling.
// `underHeader`: the top-right wave starts under the public site's fixed
// header, and follows it as it shrinks (--phdr-h).
// `enter`: the waves ease in from their corners when the shell first opens
// (public site only; styles/public-shell.css, and never with reduced motion).

import { useId } from "react";

interface Wave {
  /** The navy depth layer, a little larger than the sky waves. */
  depth: string;
  big: string;
  small: string;
  /** A hairline that follows the waves' edge. */
  line: string;
  /** The blue hugging the section's very edge, where the wave begins. */
  edge: string;
}

// Drawn in a 600 × 400 box, anchored in the top-right corner; the other two
// corners turn the box round (bottom left) or mirror it (bottom right).
const TOP_RIGHT: Wave = {
  depth: "M600,0 H112 C182,40 262,56 344,74 C440,96 500,144 540,224 C566,276 584,330 600,384 Z",
  big: "M600,0 H150 C214,34 286,46 362,62 C452,80 506,124 546,200 C572,248 588,300 600,352 Z",
  small: "M600,0 H300 C352,26 402,36 452,48 C520,64 560,106 600,178 Z",
  line: "M206,0 C272,40 348,56 418,74 C494,94 538,142 570,208 C586,242 595,276 600,306",
  edge: "M600,0 H300 C366,18 436,28 500,38 C556,48 588,76 600,128 Z",
};
const BOTTOM_LEFT: Wave = {
  depth: "M600,0 H134 C200,36 274,52 354,70 C446,92 502,136 542,214 C568,264 586,318 600,372 Z",
  big: "M600,0 H170 C232,30 300,44 372,60 C458,80 510,120 548,192 C572,238 588,290 600,340 Z",
  small: "M600,0 H320 C366,24 412,34 458,46 C522,62 562,100 600,168 Z",
  line: "M228,0 C290,36 360,52 428,70 C500,90 544,136 574,198 C590,232 596,262 600,290",
  edge: "M600,0 H320 C382,16 448,26 508,36 C560,46 590,72 600,120 Z",
};
const BOTTOM_RIGHT: Wave = {
  depth: "M600,0 H154 C220,38 290,54 368,72 C456,92 508,136 546,212 C570,260 588,312 600,366 Z",
  big: "M600,0 H190 C250,32 316,46 386,62 C466,80 514,122 550,190 C574,236 590,286 600,334 Z",
  small: "M600,0 H372 C412,22 452,32 494,42 C548,56 578,92 600,150 Z",
  line: "M246,0 C306,38 374,54 440,72 C508,92 550,138 578,200 C592,232 597,262 600,288",
  edge: "M600,0 H336 C396,16 458,26 514,34 C564,44 591,70 600,116 Z",
};

export function AppWaveBackdrop({ fixed = false, variant = "page", underHeader = false, enter = false }: {
  fixed?: boolean; variant?: "page" | "side"; underHeader?: boolean; enter?: boolean;
}) {
  // Each copy names its own gradients, so two on a page never share them.
  const id = `app-wave-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const url = (layer: string) => `url(#${id}-${layer})`;
  const layers = (wave: Wave) => (
    <>
      <path fill={url("n")} d={wave.depth} />
      <path fill={url("a")} d={wave.big} />
      <path fill={url("b")} d={wave.small} />
      <path fill="none" stroke={url("l")} strokeWidth={1.5} strokeLinecap="round" d={wave.line} />
      <path fill={url("e")} d={wave.edge} />
    </>
  );

  return (
    <div
      className={variant === "side" ? "app-waves app-waves--side" : "app-waves"}
      aria-hidden="true" data-fixed={fixed ? "" : undefined} data-testid={variant === "side" ? "app-waves-side" : "app-waves"}
      data-under-header={underHeader ? "" : undefined} data-enter={enter ? "" : undefined}
    >
      {/* The colours, once for every corner: each wave starts strongest in its
          corner and fades to nothing along its own length. */}
      <svg className="app-waves-defs" focusable="false">
        <defs>
          <linearGradient id={`${id}-n`} x1="1" y1="0" x2="0.2" y2="1">
            <stop offset="0" style={{ stopColor: "var(--app-wave-navy)", stopOpacity: "var(--app-wave-o-navy)" }} />
            <stop offset="1" style={{ stopColor: "var(--app-wave-navy)", stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id={`${id}-a`} x1="1" y1="0" x2="0.25" y2="0.9">
            <stop offset="0" style={{ stopColor: "var(--app-wave-sky-1)", stopOpacity: "var(--app-wave-o-sky-1)" }} />
            <stop offset="1" style={{ stopColor: "var(--app-wave-fade)", stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="1" y1="0" x2="0.2" y2="1">
            <stop offset="0" style={{ stopColor: "var(--app-wave-sky-2)", stopOpacity: "var(--app-wave-o-sky-2)" }} />
            <stop offset="1" style={{ stopColor: "var(--app-wave-fade)", stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id={`${id}-l`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--app-wave-sky-2)", stopOpacity: "var(--app-wave-o-line)" }} />
            <stop offset="1" style={{ stopColor: "var(--app-wave-fade)", stopOpacity: 0 }} />
          </linearGradient>
          {/* The edge: darkest right at the section's edge, gone well before
              the waves end, so it never reaches the text inside. */}
          <linearGradient id={`${id}-e`} x1="1" y1="0" x2="0.3" y2="0.8">
            <stop offset="0" style={{ stopColor: "var(--app-wave-edge)", stopOpacity: "var(--app-wave-o-edge)" }} />
            <stop offset="0.45" style={{ stopColor: "var(--app-wave-edge)", stopOpacity: "var(--app-wave-o-edge-mid)" }} />
            <stop offset="1" style={{ stopColor: "var(--app-wave-edge)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
      </svg>

      <svg className="app-wave app-wave-tr" viewBox="0 0 600 400" preserveAspectRatio="xMaxYMin meet" focusable="false">
        {layers(TOP_RIGHT)}
      </svg>
      {/* Bottom left: the waves turned round. */}
      <svg className="app-wave app-wave-bl" viewBox="0 0 600 400" preserveAspectRatio="xMinYMax meet" focusable="false">
        <g transform="rotate(180 300 200)">{layers(BOTTOM_LEFT)}</g>
      </svg>
      {/* Bottom right: the waves mirrored upwards. */}
      <svg className="app-wave app-wave-br" viewBox="0 0 600 400" preserveAspectRatio="xMaxYMax meet" focusable="false">
        <g transform="translate(0 400) scale(1 -1)">{layers(BOTTOM_RIGHT)}</g>
      </svg>
    </div>
  );
}
