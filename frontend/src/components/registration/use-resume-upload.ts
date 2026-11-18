"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { checkResumeFile } from "@/lib/resume-file";
import type { RegistrationForm } from "./form";

type Uploaded = NonNullable<RegistrationForm["resume"]>;

/** Valida y sube el CV con el flujo existente (URL firmada → Storage → confirmar). */
export function useResumeUpload(onUploaded: (resume: Uploaded) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(undefined);
    const invalid = checkResumeFile(file);
    if (invalid) {
      setError(invalid);
      clearInput();
      return;
    }
    setUploading(true);
    try {
      const saved = await api.uploadResume(file);
      onUploaded({ fileName: saved.file_name, sizeBytes: saved.size_bytes });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos subir tu CV. Intenta de nuevo.");
    } finally {
      setUploading(false);
      clearInput();
    }
  };

  return { uploading, error, inputRef, onFile };
}
