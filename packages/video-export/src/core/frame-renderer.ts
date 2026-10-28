import type { ExportSettings, TimelineExportData, RenderFrame } from "../types";
import { sceneLayers } from "../editor-model";
import { RenderPipeline } from "../pipeline/pipeline";
import {
  MediaElementRenderer,
  TextElementRenderer,
  OverlayElementRenderer,
  SubtitleElementRenderer,
} from "./renderers";
export class FrameRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private layerCanvas: HTMLCanvasElement;
  private layerContext: CanvasRenderingContext2D;
  private pipeline: RenderPipeline;
  private mediaRenderer: MediaElementRenderer;
  private textRenderer: TextElementRenderer;
  private overlayRenderer: OverlayElementRenderer;
  private subtitleRenderer: SubtitleElementRenderer;
  private settings: ExportSettings;
  constructor(settings: ExportSettings) {
    this.settings = settings;
    this.canvas = document.createElement("canvas");
    this.layerCanvas = document.createElement("canvas");
    for (const canvas of [this.canvas, this.layerCanvas]) {
      canvas.width = Math.round(settings.width * settings.resolution);
      canvas.height = Math.round(settings.height * settings.resolution);
    }
    this.context = this.canvas.getContext("2d")!;
    this.layerContext = this.layerCanvas.getContext("2d")!;
    this.pipeline = new RenderPipeline(settings);
    this.mediaRenderer = new MediaElementRenderer(settings, this.layerContext);
    this.textRenderer = new TextElementRenderer(settings, this.layerContext);
    this.overlayRenderer = new OverlayElementRenderer(
      settings,
      this.layerContext
    );
    this.subtitleRenderer = new SubtitleElementRenderer(
      settings,
      this.layerContext
    );
  }
  async renderFrame(
    data: TimelineExportData,
    time: number,
    frameNumber: number
  ): Promise<RenderFrame> {
    this.context.fillStyle = this.settings.backgroundColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.layerContext.clearRect(
      0,
      0,
      this.layerCanvas.width,
      this.layerCanvas.height
    );
    const layers = sceneLayers(data.tracks, time);
    if (this.settings.backgroundBlur) {
      const background = layers.find(
        (layer) =>
          layer.element.type === "media" && layer.element.mediaType !== "audio"
      );
      if (background?.element.type === "media") {
        await this.mediaRenderer.render(
          {
            ...background.element,
            appearance: {
              fit: "cover",
              scale: 1.1,
              blur: this.settings.backgroundBlur,
            },
          },
          background.sampleTime
        );
        this.context.drawImage(this.layerCanvas, 0, 0);
      }
    }
    for (const layer of layers) {
      const { element, sampleTime } = layer;
      this.layerContext.clearRect(
        0,
        0,
        this.layerCanvas.width,
        this.layerCanvas.height
      );
      if (element.type === "media" && element.mediaType === "audio") continue;
      if (element.type === "media")
        await this.mediaRenderer.render(element, sampleTime);
      else if (element.type === "text") await this.textRenderer.render(element);
      else if (element.type === "overlay")
        await this.overlayRenderer.render(element, sampleTime);
      else if (element.type === "subtitle")
        await this.subtitleRenderer.render(element, sampleTime);
      else throw new Error(`Unsupported effect element: ${element.id}`);
      this.context.save();
      try {
        if (layer.black) {
          this.context.fillStyle = "black";
          this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.context.globalAlpha = layer.alpha;
        this.context.drawImage(
          this.layerCanvas,
          layer.offset * this.canvas.width,
          0
        );
      } finally {
        this.context.restore();
      }
    }
    return this.pipeline.processFrame(
      {
        frameNumber,
        timestamp: time,
        canvas: this.canvas,
        context: this.context,
      },
      data,
      time
    );
  }
  getPipeline() {
    return this.pipeline;
  }
  dispose() {
    this.pipeline.dispose();
    this.mediaRenderer.dispose();
    this.textRenderer.dispose();
    this.overlayRenderer.dispose();
    this.subtitleRenderer.dispose();
  }
}
