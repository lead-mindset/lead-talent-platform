# CV de ejemplo

Cinco CV ficticios para probar la lectura de CV con IA (paso 2 del registro).

Las personas, contactos y empresas son inventados. Las universidades son reales para probar el catálogo.
No contienen datos personales reales, por eso pueden estar en el repo.

| Archivo | Área | Qué prueba |
|---|---|---|
| 01_Valentina_Rojas_CV.pdf | Enfermería, Chile | CV clásico en español, skills fuera de tecnología |
| 02_Diego_Huaman_CV_corto.docx | Turismo, Perú | CV muy corto, campos que faltan |
| 03_Mariana_Lopez_Resume_EN.pdf | Derecho, México | Inglés, dos columnas, "Mexico City" |
| 04_Carlos_Gomez_HojaDeVida.docx | Ingeniería Ambiental, Colombia | Dos universidades, tabla de Word |
| 05_Sofia_Martinez_Resume_EN.pdf | Marketing, Estados Unidos | Un solo apellido, ciudad de EE. UU., ya trabaja |

`expected.json` tiene el resultado esperado por archivo. Un campo en `null` significa que no aparece en el CV y la IA no debe inventarlo.
Los valores de `career_stage` usan los mismos códigos que `talent.profile.career_stage`.
