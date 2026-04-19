#!/usr/bin/env python3
"""
Whisper Transcription Script
Called from Node.js via child_process
Takes audio file path as argument, outputs JSON to stdout
"""

import sys
import json
import os

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file path provided"}))
        sys.exit(1)

    audio_path = sys.argv[1]

    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"File not found: {audio_path}"}))
        sys.exit(1)

    # Configuration from environment or defaults
    model_size = os.getenv("WHISPER_MODEL_SIZE", "large-v3")
    device = os.getenv("WHISPER_DEVICE", "auto")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "auto")

    try:
        from faster_whisper import WhisperModel
        import torch

        # Determine device
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"

        # Determine compute type
        if compute_type == "auto":
            compute_type = "float16" if device == "cuda" else "int8"

        # Load model
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type
        )

        # Transcribe
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            language=None,  # Auto-detect
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        # Combine segments
        transcript_parts = []
        for segment in segments:
            transcript_parts.append(segment.text)

        transcript = " ".join(transcript_parts).strip()

        # Output result as JSON
        result = {
            "text": transcript,
            "language": info.language,
            "language_probability": info.language_probability
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
