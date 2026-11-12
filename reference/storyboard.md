# Writing the storyboard

The storyboard is the scene list in `video.json`. Get it right before writing any animation code: almost every bad explainer is a script problem, not an animation problem.

## Shape of a good explainer

| Part | Length | Job |
|---|---|---|
| Hook | 5–8s | Pose the question or problem the viewer cares about. |
| Context | 1 scene | The minimum background needed to follow along. |
| Core | 2–5 scenes | The mechanism, one step per scene, built up visually. |
| Concrete example | 1 scene | Real values, real output, a real case. |
| Recap | 5–8s | Restate the 2–3 key ideas in the same words and visuals used earlier. |

Typical totals: 30–90 seconds. If it needs more than ~8 scenes, split it into two videos or cut scope.

## Rules

- **One idea per scene.** If the narration has an "and also", it's probably two scenes.
- **Narration drives timing.** People speak at ~150 words/minute (2.5 words/s). A scene's duration ≈ words / 2.5 + ~1s of breathing room. `lint.mjs` warns when narration doesn't fit.
- **Show, don't caption.** Never put the narration on screen as text. Screen text is headlines, labels and numbers; the voice carries the sentences.
- **Concrete beats abstract.** Use real names (`example.com`), real numbers (`120 ms`), real commands.
- **Consistent visual vocabulary.** Once something has a colour or shape (e.g. blue = request), keep it for the whole video. Introduce a legend if there are more than two encodings.
- **Every visual change maps to a phrase.** In the `visual` field, note which words trigger which change; in code each becomes `at: cue('those words')`.

## Scene entry template

```json
{
  "id": "the-journey",
  "duration": 18,
  "narration": "Your request goes to a resolver... That server has the answer.",
  "visual": "Laptop + resolver appear. 'resolver' (0.5s): request packet. 'root server' (5s): three servers pop in, request to root, orange referral back. 'dot-com' (8s): same to .com. 'authoritative' (10.5s): request. 'has the answer' (13.5s): green answer back to laptop."
}
```

## Timing narration within a scene

Use `cue('phrase')` from the scene context: it returns the scene time when that phrase is spoken, from the real clip length once audio exists, and from a 150 wpm estimate before that. It already fires 0.15s early, so the visual arrives with the word. Use `"duration": "auto"` so scenes stretch to fit their narration. See `examples/kubernetes-overview/scenes/`.

Without a voiceover, `cue()` still works from the reading-speed estimate. Absolute times are fine too; estimate them with `seconds ≈ words_before_it / 2.5`.

Either way, write the `narration` text exactly as it should be spoken: numbers and abbreviations the way they're said ("dot-com", "time to live"). See `voiceover.md`.
