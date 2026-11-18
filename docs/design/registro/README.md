# Diseño del registro de estudiantes (6 pasos)

Copia de las pantallas móviles del canvas de Claude Design "LEAD Talent, propuesta" (18 de noviembre de 2026).
Son la referencia visual del wizard. El canvas es la fuente de verdad: si cambia, se vuelven a copiar.

| Paso | Archivo | Qué muestra |
|---|---|---|
| 1 | QuienEres.dc.html | "¿Cuál te describe mejor?" (career_stage) y medidor de perfil al 10% |
| 2 | SubeCV.dc.html | Subir CV o "No tengo CV todavía". Prop `cvSubido` muestra el estado con CV subido |
| 3 | RevisaDatos.dc.html | Nombres, apellidos, país, ciudad, universidad, carrera, egreso. Prop `llegaConCV` alterna con y sin CV (etiquetas "Del CV") |
| 4 | Skills.dc.html | Skills sugeridas para confirmar y campo para agregar |
| 5 | QueBuscas.dc.html | Roles (hasta 5), disponibilidad y consentimiento de visibilidad (apagado) |
| 6 | PerfilListo.dc.html | Medidor al 80%, dos acciones para llegar al 100% y switch de visibilidad |

Cómo leerlos:
- Formato de prototipo (Design Component). No copiar el código tal cual: usar los textos, colores, espaciados y estructura.
- El HTML está dentro de `<x-dc>`. Los valores dinámicos (`{{...}}`) salen de `renderVals()` en el `<script>` al final.
- Los colores están en oklch. Equivalencias con los tokens del frontend: violeta `oklch(0.52 0.2 287)`, degradado `oklch(0.5584 0.2066 286.65)` → `oklch(0.487 0.2087 322.04)`, texto `oklch(0.28 0.05 272)`, texto secundario `oklch(0.5 0.03 272)`, fondo `oklch(0.975 0.008 272)`.
- Tipografía: Montserrat para títulos, Geist para el resto.
- Los estados de carga y error no están diseñados: seguir el estilo de estas pantallas.
