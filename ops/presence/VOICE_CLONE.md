# Voice clone finish — Chatterbox + jon-v1 + Video Studio

Service: `F:/Github/voice-clone-service`  
ME Manager UI: https://me.willworkforlunch.com/voice-clone  
Video Studio already defaults TTS to `jon-voice-clone` with espeak-ng soft-fallback (`src/lib/video.ts`, `src/lib/voice-clone.ts`).

## Cursor / agent (done or ready)

1. Engines present: `engines/chatterbox.py`, `engines/gpt_sovits.py`  
2. Keep espeak-ng fallback in ME Manager (already wired)  
3. Catalog provider `jon-voice-clone` as Free (already in provider tests)  
4. Document train command CONFIRM below  

## Install Chatterbox on GPU host (operator)

```powershell
cd F:\Github\voice-clone-service
.\.venv\Scripts\pip.exe install chatterbox-tts
.\scripts\start.ps1
```

Without Chatterbox, synthesize returns placeholder WAV (dev OK).

## CONFIRM — GPT_SOVITS_TRAIN_CMD

Set on the voice-clone host `.env` to the real GPT-SoVITS fine-tune invocation once the SoVITS tree path is known, for example:

```
GPT_SOVITS_TRAIN_CMD=python path\to\GPT-SoVITS\train.py --exp jon-v1 ...
GPT_SOVITS_API_URL=http://127.0.0.1:9880
VOICE_CLONE_URL=http://<gpu-host>:8xxx
VOICE_CLONE_API_KEY=<shared fleet key>
```

Until set, `POST /train` writes a **simulated** READY marker — do not treat as a real model.

## Jon-only

1. Record **45–90 minutes** of clean speech  
2. Upload via ME Manager `/voice-clone` (or `/dataset/upload`)  
3. Start train when dataset status shows enough minutes  
4. Verify Video Studio narration uses `jon-v1` without falling back  

## Acceptance

- `/health` reports Chatterbox and/or jon-v1 ready  
- Video Studio job with `voiceProvider: jon-voice-clone` produces non-placeholder audio when service is up  
