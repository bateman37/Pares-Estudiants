# Atles · Amèrica en joc

Una app para estudiar los elementos subrayados de la ficha «Amèrica físic». Interfaz y nombres de estudio en catalán. Funciona con un solo archivo `index.html`, que ya contiene los mapas, estilos, datos y juego. No necesita instalar nada, servidor propio, cuentas, claves ni servicios de mapas de pago.

## Abrirla ahora

Abre `index.html` con Chrome, Edge, Firefox o Safari actual. Puedes guardar el archivo en un ordenador y utilizarlo sin conexión. En un teléfono suele ser más cómodo abrir la versión publicada en GitHub Pages.

## Publicarla en tu repositorio

1. Descomprime el ZIP y sube **`index.html` a la raíz de un repositorio**. Puedes subir también el resto del código si quieres conservarlo y modificarlo.
2. En GitHub, entra en **Settings → Pages → Build and deployment**. Selecciona **Deploy from a branch**, la rama **main** y la carpeta **/ (root)**. Guarda.
3. Cuando GitHub termine la publicación, abre el enlace que aparece en ese mismo apartado. Ese es el enlace que puedes compartir y abrir desde el móvil.

El ZIP incluye `.nojekyll` para evitar procesamiento innecesario. No hace falta configurar Actions ni ejecutar comandos para publicar este HTML. Si el repositorio ya tiene otra web, coloca la app en una subcarpeta para no sustituir su página de inicio; se podrá abrir en la ruta de esa carpeta cuando Pages esté activo.

## Qué incluye

- **61 elementos de la ficha:** todos los subrayados, Aconcagua y el añadido manuscrito «Pascua». No se añaden las cuencas, el altiplano boliviano, Sonora o el golf de Sant Llorenç, que no están subrayados. El río Bravo/Grande aparece una sola vez.
- **Explorar:** busca lugares, filtra por zona o tipo, consulta una explicación breve y marca lo repasado.
- **Mapas:** toda América, Norte/Centro y Sudamérica. Ampliaciones de Caribe, Ártico canadiense, Alaska/Aleutianas, Galápagos y Pascua/Pacífico. Zoom y desplazamiento cuando se amplía.
- **Concurso:** escribir el nombre, elegir entre cuatro nombres o escoger uno de cuatro puntos geográficos. Rondas de 15, 30 o todo el temario disponible. Se pueden filtrar temas; cuando hay menos elementos, se ajusta la longitud de la ronda.
- **Tres pistas por partida:** 10 puntos sin pista, 7 con una, 4 con dos, 1 con tres. Las pistas se gastan en la partida completa, no se renuevan con cada pregunta.
- **Reto perfecto opcional:** un error termina la partida tras mostrar la corrección. Al volver a jugar se sortea un orden nuevo.
- **Examen:** exactamente 15 elementos aleatorios y distintos, llamadas numeradas en el mapa, respuestas de memoria, sin pistas y corrección al entregar. Solo se permite empezar con un conjunto de al menos 15 lugares.
- **Aleatoriedad:** se sortea tanto la selección como el orden. Se evita repetir inmediatamente una secuencia completa idéntica dentro de la misma sesión. Las opciones del concurso también se barajan.
- **Corrección:** ignora mayúsculas, tildes y diferencias de apóstrofes/guiones. Admite las equivalencias catalanas y castellanas incluidas expresamente. No usa coincidencia aproximada: escribir otro accidente geográfico no debe darse por válido.
- **Repaso:** al terminar se pueden ver los lugares fallados en el mapa y comenzar una ronda solo con esos errores. Ese repaso no entra en el ranking.

## Ranking y datos

Los rankings de examen y concurso están separados, con divisiones independientes según zona, número de preguntas, tema, forma de responder y reto perfecto.

- **Examen:** primero más aciertos; a igual número de aciertos, menos tiempo.
- **Concurso:** primero más puntos; después más aciertos, menos pistas y menor tiempo.
- El tiempo sigue corriendo si se cambia de pestaña o se abre un diálogo. Un examen se cronometra hasta la entrega; en el concurso también cuenta el tiempo de revisar la explicación y pasar a la siguiente pregunta.
- Una partida abandonada desde el botón de salir no genera marca. El reto perfecto que acaba con un error sí guarda los puntos obtenidos.
- Se guardan hasta 500 partidas y los lugares marcados como repasados en el navegador. El ranking muestra las 50 mejores de la modalidad elegida.

**El ranking es local a cada navegador y dispositivo.** Se puede jugar con distintos nombres, pero no es un ranking global por Internet. Abrir el HTML local y abrirlo en GitHub Pages también crea espacios de datos distintos. Para trasladar o unir marcas usa **Rànquing → Descarrega les meves marques / Importa marques**; los intentos importados se deduplican por su identificador.

Borrar los datos del navegador elimina las marcas de ese navegador. En navegación privada pueden desaparecer al cerrar la sesión. Si no se permite almacenamiento, la app avisa y funciona durante la sesión.

## Criterios geográficos

La cartografía de costas, islas, lagos, ríos y grandes regiones procede de Natural Earth 1:10m, simplificada para mantener el HTML ligero. Todos los ríos estudiados tienen geometría cartográfica, no una línea inventada a partir de dos puntos. Los límites de montañas, macizos, llanuras y desiertos son representaciones escolares orientativas. Los cabos y cumbres se identifican mediante una coordenada de referencia. Las pequeñas islas se conservan en la cartografía; los marcadores facilitan su selección.

Se respeta la terminología de la ficha. Se conservan «Grenlàndia», «Galápagos» y «Pascua», aceptando también «Groenlàndia», «Galàpags» y «Pasqua / Rapa Nui». La Sierra Madre agrupa los sistemas mexicanos occidental, oriental y del sur. El McKinley que aparece al lado en la ficha no se incluye porque no está subrayado. Se diferencia península, golfo y estrecho aunque compartan nombre. La Pampa es la llanura geográfica; Vancouver se pregunta como isla y la península de Alaska como la franja del sudoeste, no como todo el territorio de Alaska. Riu de la Plata se trata como estuario, tal como indica el material escolar.

La proyección es cilíndrica equidistante, con escala horizontal ajustada a la latitud central de cada vista. Las vistas ampliadas no son comparables en escala entre sí. No se pretende sustituir el mapa oficial de clase, que todavía no se ha facilitado.

## Archivos del proyecto

- `index.html`: entrega lista para abrir y publicar.
- `src/index.template.html`, `src/style.css`, `src/core.js`, `src/app.js`: fuentes editables.
- `src/map-data.js`: cartografía y lugares integrados, sin solicitudes de red.
- `data/places.json`: nombres, variantes, coordenadas, geometrías, explicaciones y referencias.
- `data/geography-audit.json`: correspondencia entre elementos del temario y capas cartográficas.
- `SOURCES.md`: fuentes, licencia de los datos y criterios.
- `scripts/build.py`: ensambla de nuevo el HTML; solo necesita Python 3.
- `scripts/download-data.py` y `scripts/prepare-map.py`: actualización opcional desde Natural Earth; requiere Internet y descarga los originales cuando se ejecuta.
- `tests/core.test.cjs`: pruebas de reglas, aleatoriedad, corrección y clasificación; necesita Node.js.

Para modificar el código y reconstruir:

```bash
python3 scripts/build.py
node tests/core.test.cjs
```

El proceso genera `index.html` y una copia en `dist/index.html`. Puedes publicar el primero sin configuración adicional.

## Verificación de esta entrega

Se han comprobado en navegador el mapa y las vistas, un concurso completo con pista y errores, un examen de 15 respuestas con 14 aciertos y un error, un segundo examen con selección distinta, la entrega con respuestas en blanco, las clasificaciones y su persistencia tras recarga. Se han verificado las reglas de puntuación de tres pistas, selección de preguntas, variantes de respuesta y orden del ranking mediante pruebas de lógica.

Versión 1.0.0 · 23 de octubre de 2026.
