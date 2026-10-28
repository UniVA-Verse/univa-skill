import { useProjectStore } from "@/stores/project-store";
import { GeneratedFile } from "../types";
import { useMediaStore, MediaItem, MediaType } from "@/stores/media-store";

/**
 * media importer
 * used to import generated files into media library
 */
export class MediaImporter {
  private pending = new Map<string, Promise<MediaItem>>();
  private async importOne(
    file: GeneratedFile,
    add: (id: string, item: Omit<MediaItem, "id">) => Promise<void>,
    projectId: string
  ): Promise<MediaItem> {
    const key = `${projectId}:${file.path}`;
    const waiting = this.pending.get(key);
    if (waiting) return waiting;
    const task = (async () => {
      if (useProjectStore.getState().activeProject?.id !== projectId)
        throw new Error(
          "The active project changed; reopen the target project before importing"
        );
      const existing = useMediaStore
        .getState()
        .mediaItems.find((item) => item.serverPath === file.path);
      if (existing) return existing;
      const item = await this.convertToMediaItem(file);
      try {
        if (useProjectStore.getState().activeProject?.id !== projectId)
          throw new Error(
            "The active project changed while the file was loading"
          );
        await add(projectId, item);
        const inserted = useMediaStore
          .getState()
          .mediaItems.find((media) => media.serverPath === file.path);
        if (!inserted) throw new Error("Imported media could not be persisted");
        return inserted;
      } catch (error) {
        if (item.url) URL.revokeObjectURL(item.url);
        throw error;
      }
    })();
    this.pending.set(key, task);
    try {
      return await task;
    } finally {
      this.pending.delete(key);
    }
  }

  /**
   * from file path create File object
   */
  private async createFileFromPath(
    filePath: string,
    fileName: string
  ): Promise<File> {
    try {
      const response = await fetch(
        `/api/files/read?path=${encodeURIComponent(filePath)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }

      const blob = await response.blob();
      if (!blob.size) throw new Error("Generated file is empty");
      const mimeType = this.getMimeType(fileName);

      return new File([blob], fileName, { type: mimeType });
    } catch (error) {
      console.error("Error creating file from path:", error);
      throw error;
    }
  }

  /**
   * get mime type from file extension
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.toLowerCase().split(".").pop() || "";

    const mimeTypes: Record<string, string> = {
      "mp4": "video/mp4",
      "avi": "video/x-msvideo",
      "mov": "video/quicktime",
      "mkv": "video/x-matroska",
      "webm": "video/webm",

      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "gif": "image/gif",
      "bmp": "image/bmp",
      "webp": "image/webp",

      "wav": "audio/wav",
      "mp3": "audio/mpeg",
      "aac": "audio/aac",
      "ogg": "audio/ogg",
      "flac": "audio/flac",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * transform GeneratedFile to MediaItem
   */
  private async convertToMediaItem(
    generatedFile: GeneratedFile
  ): Promise<Omit<MediaItem, "id">> {
    const actualFileName =
      generatedFile.path.split("/").pop() || generatedFile.path;
    const file = await this.createFileFromPath(
      generatedFile.path,
      actualFileName
    );

    const mediaItem: Omit<MediaItem, "id"> = {
      serverPath: generatedFile.path,
      name: generatedFile.name,
      type: generatedFile.type as MediaType,
      file,
      url: URL.createObjectURL(file),
    };

    if (generatedFile.type === "video") {
      try {
        const { duration, width, height, thumbnailUrl } =
          await this.getVideoMetadata(file);
        mediaItem.duration = duration;
        mediaItem.width = width;
        mediaItem.height = height;
        mediaItem.thumbnailUrl = thumbnailUrl;
      } catch (error) {
        URL.revokeObjectURL(mediaItem.url!);
        throw new Error("Cannot decode generated video");
      }
    } else if (generatedFile.type === "image") {
      try {
        const { width, height } = await this.getImageDimensions(file);
        mediaItem.width = width;
        mediaItem.height = height;
      } catch (error) {
        URL.revokeObjectURL(mediaItem.url!);
        throw new Error("Cannot decode generated image");
      }
    } else if (generatedFile.type === "audio") {
      try {
        const duration = await this.getAudioDuration(file);
        mediaItem.duration = duration;
      } catch (error) {
        URL.revokeObjectURL(mediaItem.url!);
        throw new Error("Cannot decode generated audio");
      }
    }

    return mediaItem;
  }

  /**
   * get video metadata like duration, dimensions, thumbnail
   */
  private getVideoMetadata(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    thumbnailUrl: string;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const url = URL.createObjectURL(file);
      const cleanup = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        video.removeAttribute("src");
        video.load();
        video.remove();
        canvas.remove();
      };
      const fail = (message: string) => {
        cleanup();
        reject(new Error(message));
      };
      const timer = setTimeout(
        () => fail("Timed out reading generated video metadata"),
        15_000
      );
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (
            !Number.isFinite(video.duration) ||
            video.duration <= 0 ||
            !video.videoWidth ||
            !video.videoHeight
          ) {
            fail("Generated video has invalid duration or dimensions");
            return;
          }
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          video.currentTime = Math.min(1, video.duration * 0.1);
        },
        { once: true }
      );
      video.addEventListener(
        "seeked",
        () => {
          try {
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get canvas context");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const result = {
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              thumbnailUrl: canvas.toDataURL("image/jpeg", 0.8),
            };
            cleanup();
            resolve(result);
          } catch {
            fail("Could not decode a frame from generated video");
          }
        },
        { once: true }
      );
      video.addEventListener(
        "error",
        () => fail("Could not load generated video"),
        { once: true }
      );
      video.src = url;
      video.load();
    });
  }

  private getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      const cleanup = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        img.remove();
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out reading generated image"));
      }, 15_000);
      img.addEventListener(
        "load",
        () => {
          const result = { width: img.naturalWidth, height: img.naturalHeight };
          cleanup();
          if (!result.width || !result.height)
            reject(new Error("Generated image has invalid dimensions"));
          else resolve(result);
        },
        { once: true }
      );
      img.addEventListener(
        "error",
        () => {
          cleanup();
          reject(new Error("Could not decode generated image"));
        },
        { once: true }
      );
      img.src = url;
    });
  }

  private getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement("audio");
      const url = URL.createObjectURL(file);
      const cleanup = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        audio.removeAttribute("src");
        audio.load();
        audio.remove();
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out reading generated audio"));
      }, 15_000);
      audio.addEventListener(
        "loadedmetadata",
        () => {
          const duration = audio.duration;
          cleanup();
          if (!Number.isFinite(duration) || duration <= 0)
            reject(new Error("Generated audio has invalid duration"));
          else resolve(duration);
        },
        { once: true }
      );
      audio.addEventListener(
        "error",
        () => {
          cleanup();
          reject(new Error("Could not decode generated audio"));
        },
        { once: true }
      );
      audio.src = url;
      audio.load();
    });
  }

  async importFiles(
    generatedFiles: GeneratedFile[],
    addMediaItem: (
      projectId: string,
      item: Omit<MediaItem, "id">
    ) => Promise<void>,
    projectId: string
  ): Promise<{
    success: MediaItem[];
    failed: { file: GeneratedFile; error: string }[];
  }> {
    const success: MediaItem[] = [];
    const failed: { file: GeneratedFile; error: string }[] = [];

    for (const generatedFile of generatedFiles) {
      try {
        success.push(
          await this.importOne(generatedFile, addMediaItem, projectId)
        );
      } catch (error) {
        failed.push({
          file: generatedFile,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { success, failed };
  }

  async validateFile(
    generatedFile: GeneratedFile
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!generatedFile.path || generatedFile.path.length < 3) {
        return { valid: false, error: "Invalid file path" };
      }

      const supportedTypes = ["video", "image", "audio"];
      if (!supportedTypes.includes(generatedFile.type)) {
        return { valid: false, error: "Unsupported file type" };
      }

      const response = await fetch(
        `/api/files/validate?path=${encodeURIComponent(generatedFile.path)}`
      );
      if (!response.ok) {
        return { valid: false, error: "File not accessible" };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Validation failed",
      };
    }
  }
}

export const mediaImporter = new MediaImporter();
