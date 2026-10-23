# Pares-Estudiants

Recursos educativos estáticos. Actualmente incluye **Atles d'Amèrica** (`index.html`), una app autónoma para estudiar «Amèrica físic» con mapas, concurso y examen.

## URL prevista

https://bateman37.github.io/Pares-Estudiants/

## Activar GitHub Pages (si aún no lo está)

1. Fusiona esta rama en `main` (la app debe estar en `main`).
2. En GitHub: **Settings → Pages → Build and deployment**.
3. En *Source* elige **Deploy from a branch**; rama **main**, carpeta **/ (root)**; pulsa **Save**.
4. Espera 1–2 minutos y abre la URL de arriba (también aparece en esa pantalla).

## Uso local

Abre `index.html` en el navegador; no necesita servidor ni conexión.

## Más información

- Documentación de la app: [`docs/ATLES_APP.md`](docs/ATLES_APP.md)
- Fuentes y licencias de datos: [`SOURCES.md`](SOURCES.md)
- Reconstruir: `python3 scripts/build.py` · Pruebas: `node tests/core.test.cjs`
