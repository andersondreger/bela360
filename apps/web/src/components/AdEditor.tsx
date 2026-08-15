'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Save, Upload, Loader2, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
import { uploadImage, marketingApi, type MarketingCreation } from '@/lib/api';

const CANVAS_W = 1080;
const CANVAS_H = 1350;

interface BackgroundPreset {
  id: string;
  label: string;
  colors: [string, string];
  angle: number; // graus
}

const BACKGROUNDS: BackgroundPreset[] = [
  { id: 'roxo', label: 'Roxo Elegante', colors: ['#7C3AED', '#DB2777'], angle: 135 },
  { id: 'dourado', label: 'Dourado', colors: ['#B45309', '#F59E0B'], angle: 135 },
  { id: 'rosa', label: 'Rosa Suave', colors: ['#F472B6', '#FBCFE8'], angle: 160 },
  { id: 'verao', label: 'Verão', colors: ['#06B6D4', '#3B82F6'], angle: 135 },
  { id: 'noite', label: 'Noite', colors: ['#0F172A', '#7C3AED'], angle: 160 },
  { id: 'menta', label: 'Menta', colors: ['#10B981', '#34D399'], angle: 135 },
  { id: 'preto', label: 'Preto & Branco', colors: ['#111827', '#4B5563'], angle: 135 },
];

const LAYOUTS = [
  { id: 'circular', label: 'Foto circular + texto embaixo' },
  { id: 'banner', label: 'Foto grande (banner) + texto sobreposto' },
  { id: 'sem-foto', label: 'Só texto (sem foto)' },
] as const;

type LayoutId = (typeof LAYOUTS)[number]['id'];

const STATUS_LABELS: Record<MarketingCreation['status'], { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  READY: { label: 'Pronta pra postar', className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  PUBLISHED: { label: 'Publicada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
};

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Desenha `img` cobrindo o retângulo (x, y, w, h) mantendo proporção, tipo `object-fit: cover`.
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface AdEditorProps {
  businessName: string;
  primaryColor?: string;
  onSaved?: (creation: MarketingCreation) => void;
}

export function AdEditor({ businessName, primaryColor, onSaved }: AdEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);

  const [layout, setLayout] = useState<LayoutId>('circular');
  const [backgroundId, setBackgroundId] = useState<string>(BACKGROUNDS[0].id);
  const [headline, setHeadline] = useState('Promoção especial');
  const [subtext, setSubtext] = useState('Agende seu horário e aproveite');
  const [badge, setBadge] = useState('-20%');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [title, setTitle] = useState('Nova publicidade');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const [creations, setCreations] = useState<MarketingCreation[]>([]);
  const [loadingCreations, setLoadingCreations] = useState(true);

  const loadCreations = () => {
    setLoadingCreations(true);
    marketingApi
      .listCreations()
      .then(setCreations)
      .catch(() => setCreations([]))
      .finally(() => setLoadingCreations(false));
  };

  useEffect(loadCreations, []);

  const background = BACKGROUNDS.find((b) => b.id === backgroundId) || BACKGROUNDS[0];

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Fundo (gradiente)
    const rad = (background.angle * Math.PI) / 180;
    const x1 = CANVAS_W / 2 - (Math.cos(rad) * CANVAS_W) / 2;
    const y1 = CANVAS_H / 2 - (Math.sin(rad) * CANVAS_H) / 2;
    const x2 = CANVAS_W / 2 + (Math.cos(rad) * CANVAS_W) / 2;
    const y2 = CANVAS_H / 2 + (Math.sin(rad) * CANVAS_H) / 2;
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, background.colors[0]);
    gradient.addColorStop(1, background.colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const photo = photoImgRef.current;

    if (layout === 'banner' && photo) {
      drawCover(ctx, photo, 0, 0, CANVAS_W, CANVAS_H * 0.68);
      // Gradiente escurecendo a base pra texto legível
      const overlay = ctx.createLinearGradient(0, CANVAS_H * 0.4, 0, CANVAS_H);
      overlay.addColorStop(0, 'rgba(0,0,0,0)');
      overlay.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else if (layout === 'circular' && photo) {
      const size = 520;
      const cx = CANVAS_W / 2;
      const cy = 430;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      drawCover(ctx, photo, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Nome do negócio no topo
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '600 34px sans-serif';
    ctx.fillText(businessName || 'Seu negócio', CANVAS_W / 2, 90);

    // Badge (selo de desconto/promo)
    if (badge.trim()) {
      ctx.font = '700 40px sans-serif';
      const badgeText = badge.trim();
      const paddingX = 36;
      const w = ctx.measureText(badgeText).width + paddingX * 2;
      const h = 76;
      const bx = CANVAS_W / 2 - w / 2;
      const by = layout === 'circular' ? 700 : CANVAS_H - 430;
      ctx.fillStyle = primaryColor || '#DB2777';
      drawRoundedRect(ctx, bx, by, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, CANVAS_W / 2, by + h / 2 + 2);
      ctx.textBaseline = 'alphabetic';
    }

    // Texto principal
    const textTop = layout === 'circular' ? (badge.trim() ? 830 : 760) : CANVAS_H - (badge.trim() ? 320 : 260);
    ctx.fillStyle = '#fff';
    ctx.font = '800 64px sans-serif';
    const headlineLines = wrapText(ctx, headline || '', CANVAS_W - 160);
    let y = textTop;
    for (const line of headlineLines.slice(0, 3)) {
      ctx.fillText(line, CANVAS_W / 2, y);
      y += 74;
    }

    ctx.font = '400 36px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const subLines = wrapText(ctx, subtext || '', CANVAS_W - 200);
    y += 16;
    for (const line of subLines.slice(0, 3)) {
      ctx.fillText(line, CANVAS_W / 2, y);
      y += 46;
    }
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, backgroundId, headline, subtext, badge, businessName, primaryColor, photoLoaded]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photoImgRef.current = img;
      setPhotoLoaded((v) => !v);
      setUploadingPhoto(false);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setUploadingPhoto(false);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const canvasToBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => canvasRef.current?.toBlob((blob) => resolve(blob), 'image/png', 0.95));

  const handleDownload = async () => {
    const blob = await canvasToBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'publicidade').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const blob = await canvasToBlob();
      if (!blob) throw new Error('Não foi possível gerar a imagem');
      const file = new File([blob], 'publicidade.png', { type: 'image/png' });
      const { url } = await uploadImage(file);
      const creation = await marketingApi.createCreation({
        title: title.trim() || 'Publicidade',
        imageUrl: url,
        background: backgroundId,
        status: 'READY',
      });
      setCreations((prev) => [creation, ...prev]);
      setSaved(true);
      onSaved?.(creation);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar publicidade');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (creation: MarketingCreation, status: MarketingCreation['status']) => {
    try {
      const updated = await marketingApi.updateCreation(creation.id, { status });
      setCreations((prev) => prev.map((c) => (c.id === creation.id ? updated : c)));
    } catch {
      // silencioso — não é crítico
    }
  };

  const handleDeleteCreation = async (id: string) => {
    if (!confirm('Remover esta criação da galeria?')) return;
    try {
      await marketingApi.deleteCreation(id);
      setCreations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Controles */}
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Modelo</label>
            <div className="space-y-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLayout(l.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    layout === l.id ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {layout !== 'sem-foto' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Foto</label>
              <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="w-full">
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {photoImgRef.current ? 'Trocar foto' : 'Enviar foto'}
              </Button>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Fundo</label>
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBackgroundId(bg.id)}
                  title={bg.label}
                  className={`h-12 rounded-lg border-2 transition-transform ${
                    backgroundId === bg.id ? 'border-foreground scale-105' : 'border-transparent'
                  }`}
                  style={{ background: `linear-gradient(${bg.angle}deg, ${bg.colors[0]}, ${bg.colors[1]})` }}
                />
              ))}
            </div>
          </div>

          <Input label="Selo (opcional)" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="-20%, Novidade, etc." />
          <Input label="Título" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Promoção especial" />
          <Textarea label="Texto" value={subtext} onChange={(e) => setSubtext(e.target.value)} rows={2} placeholder="Agende seu horário e aproveite" />
          <Input label="Nome da criação (pra sua galeria)" value={title} onChange={(e) => setTitle(e.target.value)} />

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4" />
              Baixar
            </Button>
            <Button type="button" variant="primary" onClick={handleSave} loading={saving} className="flex-1">
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? 'Salva!' : 'Salvar na galeria'}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-start justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full max-w-[380px] rounded-2xl border border-border shadow-md"
          />
        </div>
      </div>

      {/* Galeria: o que já foi criado e o que está planejado */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Suas criações</h3>
        {loadingCreations ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : creations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ImageIcon className="mx-auto mb-2 h-6 w-6" />
            Nenhuma publicidade criada ainda. Monte uma acima e clique em &quot;Salvar na galeria&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {creations.map((creation) => (
              <div key={creation.id} className="overflow-hidden rounded-xl border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={creation.imageUrl} alt={creation.title} className="aspect-[4/5] w-full object-cover" />
                <div className="p-2.5">
                  <p className="truncate text-xs font-medium text-foreground" title={creation.title}>
                    {creation.title}
                  </p>
                  <select
                    value={creation.status}
                    onChange={(e) => handleStatusChange(creation, e.target.value as MarketingCreation['status'])}
                    className={`mt-1.5 w-full rounded-md border-0 px-1.5 py-1 text-[11px] font-medium ${STATUS_LABELS[creation.status].className}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDeleteCreation(creation.id)}
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
