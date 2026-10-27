/**
 * The AI-written features of Ze-Notes, started and stopped in one place.
 *
 * **AI zones.** Code written with an AI assistant lives in its own folders and uses the original
 * Ze-Notes code only by importing it; the original files are not edited for it:
 *
 * - `src/Core/Extensions.ts` (this file)
 * - `src/Core/Bridge/` — the HTTP bridge for pages such as Clew
 * - `src/Core/Annotate/` — making highlights, shared by the bridge and the reading pass
 * - `src/Core/Reading/` — the reading pass: an AI proposes highlights, a person accepts them
 * - `app/chrome/content/xhtml/reading/` — the reading pass's own window
 *
 * The original code reaches them through this file alone, at three touch points:
 * `src/Core/index.ts` (it lists `Extensions`), `src/index.ts` (`Extensions.init()`), and
 * `app/chrome/core/appbase.js` (`Extensions.stop()`). `Core.Bridge` stays listed too, because the
 * settings page reads it. `npm run check:zones` lists every changed file outside the zones.
 */
import Bridge from "./Bridge";
import Reading from "./Reading";

const Extensions = {
  init(): void {
    Bridge.init();
    Reading.init();
  },

  async stop(): Promise<void> {
    // Each on its own: one failing to stop must not keep the other running.
    await Promise.allSettled([Bridge.stop(), Reading.stop()]);
  },
};

export default Extensions;
