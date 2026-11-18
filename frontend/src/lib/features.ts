/**
 * Funciones que se encienden o apagan por variable de entorno. Este es el único lugar que las lee.
 *
 * Las variables NEXT_PUBLIC_* quedan fijas al compilar: cambiar el valor exige un build nuevo
 * (en Vercel, un redeploy). Por eso se leen con `process.env.NOMBRE` literal.
 */
export const features = {
  /** Login con Google. Solo se enciende si el valor es exactamente "true". */
  authGoogle: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true",
} as const;
