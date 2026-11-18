"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, ApiError, type Resume } from "@/lib/api";
import { checkResumeFile, formatSize, RESUME_ACCEPT } from "@/lib/resume-file";

export function CvCard() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getResume()
      .then(setResume)
      .catch(() => setError("No pudimos cargar tu CV."))
      .finally(() => setLoading(false));
  }, []);

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(undefined);
    const invalid = checkResumeFile(file);
    if (invalid) return setError(invalid);
    setUploading(true);
    try {
      await api.uploadResume(file);
      setResume(await api.getResume());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos subir tu CV. Intenta de nuevo.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  // La URL de descarga dura 5 minutos: pedir una nueva al abrir.
  const openResume = async () => {
    try {
      const fresh = await api.getResume();
      if (fresh?.download_url) window.open(fresh.download_url, "_blank", "noopener,noreferrer");
    } catch {
      setError("No pudimos abrir tu CV.");
    }
  };

  const picker = (
    <input
      ref={input}
      type="file"
      className="sr-only"
      accept={RESUME_ACCEPT}
      disabled={uploading}
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-h3 font-semibold">Currículum (CV)</CardTitle>
      </CardHeader>
      <CardContent className="p-(--card-spacing) pt-2">
        <p className="text-small text-muted-foreground">Sube tu currículum para que las empresas puedan verlo.</p>

        {loading ? (
          <p className="mt-4 text-small text-muted-foreground">Cargando…</p>
        ) : resume ? (
          <div className="mt-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-brand-purple-light" />
              <span className="min-w-0 flex-1 truncate text-small font-medium">{resume.file_name}</span>
              <span className="text-caption text-muted-foreground">{formatSize(resume.size_bytes)}</span>
              <Button variant="ghost" size="sm" onClick={openResume}>
                Ver
              </Button>
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-small font-medium text-brand-purple-light transition-colors hover:bg-muted">
              <Upload className="size-4" />
              {uploading ? "Subiendo…" : "Reemplazar currículum"}
              {picker}
            </label>
          </div>
        ) : (
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-small font-medium text-brand-purple-light transition-colors hover:bg-muted">
            <Upload className="size-4" />
            {uploading ? "Subiendo…" : "Subir currículum"}
            {picker}
          </label>
        )}
        <p className="mt-2 text-caption text-muted-foreground">PDF, DOC o DOCX. Máximo 10 MB.</p>
        {error && (
          <p className="mt-2 text-caption text-destructive-light" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
