/** Reglas del archivo de CV, compartidas por la tarjeta del perfil y el paso 2 del registro. */

export const RESUME_ACCEPT = ".pdf,.doc,.docx";
export const RESUME_MAX_BYTES = 10 * 1024 * 1024;
export const RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/** Mensaje de error si el archivo no sirve; undefined si está bien. El backend valida lo mismo. */
export function checkResumeFile(file: File): string | undefined {
  if (!RESUME_TYPES.includes(file.type)) return "Sube un PDF, DOC o DOCX.";
  if (file.size > RESUME_MAX_BYTES) return "El archivo supera los 10 MB.";
  return undefined;
}

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Etiqueta corta del tipo de archivo: PDF, DOC o DOCX. */
export function fileKind(fileName: string): string {
  return fileName.split(".").pop()?.toUpperCase() ?? "CV";
}
