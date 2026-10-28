"""Read-only configuration inspection. Never contacts providers or loads model weights."""
from pathlib import Path
import importlib.util
import shutil
import os


def inspect_capabilities(config):
    result = {}
    for name, section in (("video", "video_gen"), ("image", "image_gen"), ("audio", "audio_gen"), ("video_editing", "video_editing")):
        options = config.get(section) or {}
        provider = options.get("provider", "wavespeed")
        key = "ARK_API_KEY" if provider == "volcengine_ark" else "WAVESPEED_API_KEY"
        nested = options.get(provider) or {}
        configured = bool(os.environ.get(key) or nested.get("api_key") or (options.get("wavespeed_api") if provider == "wavespeed" else None))
        result[name] = {"status": "configured" if configured else "missing_configuration", "provider": provider,
                        "reason": "Credentials configured; live service has not been verified" if configured else f"Set {key}", "verified": False}
    models = config.get("video_tracking") or {}
    paths = [os.environ.get("VIDEO_TRACK_SA2VA_PATH") or models.get("sa2va_model_path"), os.environ.get("VIDEO_TRACK_SAM_PATH") or models.get("sam_model_path")]
    configured = all(p and Path(p).exists() for p in paths)
    import platform
    cuda_possible = platform.system() != "Darwin" and importlib.util.find_spec("torch") is not None
    result["tracking"] = {"status": "configured" if configured and cuda_possible else "unavailable" if configured else "missing_configuration", "reason": "Local models configured; CUDA inference is unverified" if configured and cuda_possible else "Tracking requires configured Sa2VA/SAM models and a CUDA environment", "verified": False}
    llm = config.get("llm") or {}
    result["understanding"] = {"status": "configured" if os.environ.get("LLM_OPENAI_API_KEY") or llm.get("openai_api_key") else "missing_configuration", "reason": "Multimodal API configuration is unverified" if os.environ.get("LLM_OPENAI_API_KEY") or llm.get("openai_api_key") else "Configure the multimodal API", "verified": False}
    result["local_export"] = {"status": "configured", "reason": "Browser codec support is checked before export", "verified": False}
    result["ffmpeg"] = {"status": "configured" if shutil.which("ffmpeg") and shutil.which("ffprobe") else "unavailable", "reason": "Local binaries available" if shutil.which("ffmpeg") and shutil.which("ffprobe") else "Install FFmpeg and ffprobe", "verified": False}
    return {"capabilities": result}
