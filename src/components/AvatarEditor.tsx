import { useEffect, useState, type KeyboardEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCcw, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cropAvatar } from "@/lib/crop-avatar";
import { suggestPhotoCrop } from "@/lib/photo-crop.functions";

interface AvatarEditorProps {
  file: File;
  onCancel: () => void;
  onSave: (file: File) => Promise<boolean>;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This image cannot be opened."));
    img.src = src;
  });
}

async function toSmallDataUrl(img: HTMLImageElement) {
  const scale = Math.min(1, 768 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarEditor({ file, onCancel, onSave }: AvatarEditorProps) {
  const suggest = useServerFn(suggestPhotoCrop);
  const [source, setSource] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [initialArea, setInitialArea] = useState<Area | undefined>();
  const [cropperKey, setCropperKey] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function changeZoom(next: number) {
    const value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 10) / 10));
    setZoom(value);
    setAnnouncement(`Zoom ${value.toFixed(1)} times`);
  }

  function reset() {
    setInitialArea(undefined);
    setCropperKey((k) => k + 1);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAnnouncement("Photo position and zoom reset");
  }

  async function suggestCrop() {
    if (!source || suggesting) return;
    setSuggesting(true);
    setAnnouncement("Finding a clear, well-framed crop…");
    try {
      const img = await loadImage(source);
      const result = await suggest({ data: { image: await toSmallDataUrl(img) } });
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const side = result.size * Math.min(w, h);
      const left = Math.min(w - side, Math.max(0, result.centerX * w - side / 2));
      const top = Math.min(h - side, Math.max(0, result.centerY * h - side / 2));
      setInitialArea({ x: (left / w) * 100, y: (top / h) * 100, width: (side / w) * 100, height: (side / h) * 100 });
      setCropperKey((k) => k + 1);
      const msg = `Suggested crop applied. ${result.reason} You can still adjust it before saving.`;
      setAnnouncement(msg);
      toast.success("Suggested crop applied", { description: result.reason });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Couldn't get a suggestion for this photo.";
      setAnnouncement(msg);
      toast.error(msg);
    } finally {
      setSuggesting(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      changeZoom(zoom + 0.1);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      changeZoom(zoom - 0.1);
    } else if (event.key === "0") {
      event.preventDefault();
      reset();
    } else if (event.key.startsWith("Arrow")) {
      setAnnouncement("Photo moved");
    }
  }

  async function save() {
    if (!area || saving) return;
    setSaving(true);
    try {
      const photo = await cropAvatar(source, area);
      if (await onSave(photo)) onCancel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save your photo. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || imageError;

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open && !saving) onCancel(); }}
      title="Adjust profile photo"
      description="Move and zoom your photo, or ask for a suggested crop, then save."
      className="w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-lg p-4 sm:p-6"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
          <Button disabled={saving || suggesting || !area || imageError} onClick={() => void save()}>
            {saving ? "Saving…" : "Save photo"}
          </Button>
        </div>
      }
    >
      <p id="avatar-crop-help" className="text-sm text-muted-foreground">
        Keyboard: focus the photo, use arrow keys to move it (hold Shift for bigger steps), + and − to zoom, 0 to reset.
      </p>
      <div
        role="group"
        aria-label="Photo crop area"
        aria-describedby="avatar-crop-help"
        onKeyDown={onKeyDown}
        className="avatar-crop relative aspect-square max-h-[min(48dvh,360px)] w-full overflow-hidden rounded-lg bg-muted focus-within:ring-2 focus-within:ring-ring"
      >
        {source && !imageError ? (
          <Cropper
            key={cropperKey}
            image={source}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={1}
            keyboardStep={10}
            {...(initialArea ? { initialCroppedAreaPercentages: initialArea } : {})}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            onMediaLoaded={() => setImageError(false)}
            mediaProps={{ onError: () => { setImageError(true); setArea(null); }, alt: "Your selected photo" }}
            cropperProps={{ "aria-label": "Crop frame. Use arrow keys to move the photo, plus and minus to zoom.", "aria-describedby": "avatar-crop-help" } as never}
            style={{ containerStyle: { background: "var(--muted)" } }}
          />
        ) : imageError ? (
          <p role="alert" className="p-6 text-sm text-destructive">This image cannot be opened. Please choose a JPG, PNG or WebP photo.</p>
        ) : null}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="avatar-zoom">Zoom</Label>
          <span className="text-sm tabular-nums text-muted-foreground" aria-hidden="true">{zoom.toFixed(1)}×</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Zoom out" disabled={busy || zoom <= MIN_ZOOM} onClick={() => changeZoom(zoom - 0.1)}>
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Slider id="avatar-zoom" aria-label="Photo zoom" aria-valuetext={`${zoom.toFixed(1)} times`} min={MIN_ZOOM} max={MAX_ZOOM} step={0.1} value={[zoom]} disabled={busy} onValueChange={(values) => setZoom(values[0] ?? 1)} />
          <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={busy || zoom >= MAX_ZOOM} onClick={() => changeZoom(zoom + 0.1)}>
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={busy || suggesting || !source} aria-busy={suggesting} onClick={() => void suggestCrop()}>
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {suggesting ? "Suggesting…" : "Suggest crop"}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
          </Button>
        </div>
      </div>
    </Modal>
  );
}
