# 🛣️ Diseño de Pavimento AASHTO-93 — Herramienta Online

Aplicación web **gratuita y de acceso libre** para el diseño de pavimentos **flexibles y rígidos** por el método **AASHTO-93**, con especificación de geosintéticos según **AASHTO M288-00** y diseño de **estabilización química de suelos** (AASHTO M216 / M85 / T220).

> ⚠️ **Aviso:** Herramienta académica y de referencia. Todo diseño debe ser validado por un ingeniero civil responsable antes de su aplicación en obra.

## 🌐 Demo

https://elancamiloruiizque-spec.github.io/calculadora-pavimentos-comfenalco/

## ✨ Características

| Módulo | Descripción |
|--------|-------------|
| 🧮 **AASHTO-93 Flexible** | Cálculo de SN requerido y espesores por capas (carpeta, base, subbase) |
| 🧱 **AASHTO-93 Rígido** | Cálculo del espesor de losa y base granular |
| 🚦 **Tránsito** | ESAL directo o cálculo desde TPD + conteo vehicular + tasa de crecimiento |
| 🧵 **Geosintéticos M288-00** | Tablas 1–7 + Apéndice A1, selección automática por CBR |
| 🧪 **Estabilización química** | Recomendación de cal / cemento / combinado según clasificación AASHTO del suelo |
| 🔩 **Juntas y acero** | Predimensionamiento de dóvelas, barras de amarre y tramos de losa |
| 📄 **Informe técnico** | Genera informe imprimible / exportable a PDF en nueva pestaña |
| 🎨 **Visualización** | Sección transversal animada con deformación bajo carga vehicular |

## 🧮 Metodología

### Pavimento flexible (AASHTO-93)

```text
log(W18) = ZR·So + 9.36·log(SN+1) − 0.20
         + log(ΔPSI/2.7) / [0.40 + 1094/(SN+1)^5.19]
         + 2.32·log(Mr) − 8.07
```

### Pavimento rígido (AASHTO-93)

```text
log(W18) = ZR·So + 7.35·log(D+1) − 0.06
         + log(ΔPSI/3.0) / [1 + 1.624×10⁷/(D+1)^8.46]
         + (4.22 − 0.32·pt)·log[ Sc·Cd·(D^0.75−1.132) /
           (215.63·J·(D^0.75 − 18.42/(Ec/k)^0.25)) ]
```

### Juntas y acero

- **Tramo entre juntas:** L ≤ mín(24·D ; 4.5 m ; 1.25·B)
- **Pasadores (dóvelas):** Ø ≈ D/8, longitud 450 mm, separación 300 mm
- **Barras de amarre:** As = 1000·fa·γc·D·b / (0.67·fy)

## 📚 Normas de referencia

- **AASHTO** — Guide for Design of Pavement Structures (1993)
- **AASHTO M 288-00** — Geosynthetic Specification for Highway Applications
- **AASHTO M 216** — Quicklime and Hydrated Lime for Soil Stabilization
- **AASHTO M 85** — Portland Cement
- **AASHTO T 220 / T 99 / T 180 / T 88 / T 90 / T 176 / T 267 / T 290**
- **ASTM** — D4632, D4833, D4533, D4491, D4751, D4355, D5102, D1633, D6276
- **INVÍAS** — Art. 500 (referencia Colombia, verificar edición vigente)

## 📁 Estructura del proyecto

```text
.
├── index.html      # Estructura HTML
├── estilos.css     # Estilos visuales
├── app.js          # Lógica de cálculo y visualización
├── README.md       # Este archivo
├── LICENSE         # Licencia MIT
├── .gitignore      # Archivos a ignorar
├── .nojekyll       # Evita el procesamiento Jekyll en GitHub Pages
└── 404.html        # Página de error personalizada
```

## 🚀 Despliegue en GitHub Pages

1. Crea un repositorio público en GitHub.
2. Sube todos los archivos a la raíz del repositorio.
3. Ve a **Settings → Pages**.
4. En **Source**, elige `Deploy from a branch`.
5. Selecciona la rama `main` y la carpeta `/ (root)`.
6. Guarda y espera ~1 minuto.

Tu URL será:

https://elancamiloruiizque-spec.github.io/calculadora-pavimentos-comfenalco/

## 💻 Uso local

No requiere instalación ni dependencias. Solo abre `index.html` en el navegador, o sirve localmente con:

```bash
python -m http.server 8000
# Visitar http://localhost:8000
```

O con Node.js:

```bash
npx serve .
```

## 🌍 Compatibilidad

- ✅ Chrome / Edge / Firefox / Safari (versiones modernas)
- ✅ Escritorio, tablet y móvil (diseño responsive)
- ✅ Funciona offline (solo las fuentes se cargan desde Google Fonts)

## 📄 Licencia

MIT — ver [LICENSE](LICENSE). Libre uso, modificación y distribución.

## 👤 Créditos

Desarrollado en el marco de la asignatura **Diseño de Pavimentos**
Fundación Universitaria Tecnológico Comfenalco.

Contribuciones, mejoras y reportes de errores son bienvenidos vía **Issues** o **Pull Requests**.

## ⚠️ Descargo de responsabilidad

Este software se distribuye con fines **académicos y de referencia**. Los resultados obtenidos deben ser verificados por un ingeniero civil calificado antes de tomar decisiones de diseño o construcción. Los autores no se hacen responsables del uso indebido de los resultados.
