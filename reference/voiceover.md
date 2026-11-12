# Voiceover

Narration audio is generated with the **OpenRouter MCP server's `generate-speech` tool**. The skill's scripts never call a TTS API themselves: `narration.mjs` works out what needs generating, and records each clip you generate so it's cached, placed and mixed correctly.

If the OpenRouter MCP tools (`generate-speech`, `list-models`, `get-model`) aren't available in this session, say so and stop the voiceover part. Everything else (preview, captions, silent renders) still works.

## 1. Choose a model and voice

Add a `voice` block to `video.json`:

```json
"voice": { "model": "elevenlabs/eleven-v4", "voice": "george" }
```

| Field | Meaning |
|---|---|
| `model` | OpenRouter TTS model slug (required). |
| `voice` | Voice ID from the model's `supported_voices`. Omit only if the model has a default. |
| `instructions` | Delivery guidance ("warm, clear explainer narrator, measured pace"). Honoured by instructable models (Gemini TTS, OpenAI-style models); ignored by others. It applies to every scene, so keep it general. |
| `responseFormat` | Force `"pcm"` or `"mp3"` in the printed tool arguments. Normally unnecessary: Gemini and HeyGen models get `pcm` automatically. |
| `speed` | Speed multiplier, for models that support it. |
| `lead` | Seconds from scene start to when speech begins (default `0.5`, just after the fade-in). |
| `tail` | Seconds of silence after speech before an `"auto"` scene ends (default `0.8`). |

To pick, use the MCP tools: `list-models` with `output_modalities: "speech"` lists models with prices, and `get-model` shows one model's `supported_voices`. Good defaults:

- **`elevenlabs/eleven-v4`**: the most natural narration; ~$0.08 per 1,000 characters billed in testing (a 60s video is ~800–900 characters ≈ $0.07).
- **`elevenlabs/eleven-v4-turbo`** / **`eleven-flash-v2.5`**: half the price, slightly less expressive.
- **`google/gemini-3.8-flash-tts`**: about a quarter of ElevenLabs' cost (~$0.015 for a 65s video in testing), honours `instructions`, 30 voices (e.g. `Charon`, `Kore`, `Puck`). It only returns raw PCM; `status` adds `"response_format": "pcm"` for it automatically. It pauses longer at commas than ElevenLabs, which `cue()` measures and follows.
- **Kokoro** and other budget models: cheapest, less natural.

ElevenLabs' premade voice *names* (e.g. `george`) stop working on 2026-12-31, according to the OpenRouter MCP tool description, which asks for voice IDs after that. OpenRouter's docs don't say where to get them: `get-model` lists only names. ElevenLabs voice IDs come from ElevenLabs itself (its voice library or `GET /v1/voices`). It's unconfirmed that OpenRouter accepts a raw ElevenLabs voice ID; test with a one-line clip before relying on it.

Keep the same voice for the whole video. Ask the user before switching to a much more expensive model.

## 2. See what needs generating

```bash
node SKILL_DIR/scripts/narration.mjs status <project-dir>
```

This prints each scene's audio state (`todo`, `stale` or its length) and, for every scene that needs a clip, the **exact JSON arguments** for `generate-speech` plus the matching `add` command. Clips are keyed on model + voice + instructions + speed + narration text, so editing a scene's narration marks only that scene stale.

## 3. Generate and register each clip

For each scene listed:

1. Call `generate-speech` with exactly the printed arguments. Copy `input` verbatim. If the text differs, the clip won't match the scene and will be flagged stale. Independent scenes can be generated in parallel.
2. The tool saves the audio and reports the file path. Register it:
   ```bash
   node SKILL_DIR/scripts/narration.mjs add <project-dir> <scene-id> <saved-file>
   ```
   This copies it to `audio/<scene>.<hash>.mp3`, measures its length and its pauses, and updates `audio/manifest.json`. It prints the clip length and speaking rate. Raw PCM output (Gemini TTS saves it as a `.bin` file) is detected and converted, assuming 24 kHz mono, which is what Gemini returns. Pass `--pcm-rate N` for a model with a different rate.

Run `status` again at the end; it should say all clips are up to date. Don't delete `audio/`: it's the paid-for cache.

## 4. Timing scenes to the voice

- Use `"duration": "auto"` for voiced scenes. The scene becomes `lead + clip length + tail`, and never shorter than its animations. With fixed durations, lint warns when the clip doesn't fit.
- Time animations with `cue('phrase')` rather than hand-estimated seconds. When a clip is registered, `add` measures where speech starts and ends and where it pauses. `cue()` anchors each clause boundary (after `,` `.` `?` `!` `:` `;` `—`) to the matching pause, then interpolates within the clause. Phrases that start a clause land on the measured speech start for both ElevenLabs and Gemini. Mid-clause phrases are interpolated within a 2–3s stretch. It fires 0.15s early by default so the visual arrives with the word. Before audio exists, it uses a 150 wpm estimate. Generating audio later shifts everything automatically, with no code changes.
- For the tightest sync, cue the phrase that **starts a clause** (`cue('which points it')`) rather than a word in the middle of one.
- `voice.end` (scene time when speech finishes) is handy for effects that should run until the speaker stops.
- If a beat needs to land more precisely, nudge it: `cue('replacement', 0.2)`.

## 5. Check, preview, render

- `lint.mjs` reports clips that are missing or stale, and scenes too short for their audio.
- `serve.mjs` plays the narration in sync with the preview (press `m` to mute). Scrubbing re-syncs it.
- `render.mjs` mixes every clip at `scene start + lead` into one track (also saved as `out/narration.mp3`) and muxes it as MP3 audio. `--no-voice` renders silent; `--audio file` substitutes a different track; `--audio-codec aac` writes AAC for platforms that require it.

## Writing narration for TTS

- Write it the way it should be spoken: "dot-com", "time to live", "three copies", not ".com", "TTL", "3".
- Short sentences. Commas and full stops become pauses, and `cue()` accounts for them.
- One clip per scene keeps regeneration cheap: fixing one line re-bills one scene.
- Avoid narration that only makes sense alongside a specific animation frame ("as you can see here..."). Say what the viewer is seeing instead.
