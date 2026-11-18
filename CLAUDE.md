# Regla permanente de este repo

**Nunca mergees ni hagas push de `qa`, `feat/registro` ni ninguna rama que venga de ellas hacia `master` o `dev`.**

`master` y `dev` son la plataforma anterior de LEAD (otra aplicación). `dev` tiene un workflow (`deploy-qa.yml`) que aplica migraciones en otra base de datos.
