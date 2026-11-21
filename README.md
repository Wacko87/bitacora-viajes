<p align="center">
  <img src="public/logo.webp" alt="Bitácora de Viajes" width="128" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.25);" />
</p>

<h1 align="center">✈️ Bitácora de Viajes en Pareja</h1>
<p align="center"><b>Gabinete Numismático 3D • Crónica a Dos Voces • Álbum Editorial • PWA Offline-First</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Versi%C3%B3n-1.0.0-amber.svg?style=for-the-badge&color=f59e0b" alt="Versión 1.0.0" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Fastify-5.2-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify 5" />
  <img src="https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite WAL" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Ready" />
</p>

<p align="center">
  <a href="#-demostración-visual">Demostración</a> •
  <a href="#-características-destacadas">Características</a> •
  <a href="#-despliegue-rápido-con-docker">Despliegue</a> •
  <a href="#-variables-de-entorno">Configuración</a> •
  <a href="#-arquitectura-técnica">Arquitectura</a> •
  <a href="#-seguridad-y-resiliencia">Seguridad</a>
</p>

---

## 📖 Introducción

**Bitácora de Viajes** es una aplicación web progresiva (**PWA**) privada y autoalojable creada específicamente para parejas que viajan juntas. 

A diferencia de las redes sociales convencionales, se enfoca en la intimidad del viaje: registrar anécdotas conjuntas desde dos puntos de vista simultáneos (**crónica a dos voces**), calcular el **clima histórico** real vivido en cada ciudad, documentar costes e inclusiones, imprimir un **libro de viaje editorial** en PDF y preservar los recuerdos tangibles en un **gabinete numismático interactivo en 3D**.

---

## 📸 Demostración Visual

### 🗺️ Cuaderno de Viajes & Crónica a Dos Voces
| Listado de Expediciones y Presupuestos | Detalle del Viaje & Crónicas Simultáneas |
| :---: | :---: |
| <img src="docs/screenshots/02-trips-view.png" width="100%" alt="Cuaderno de Viajes" /> | <img src="docs/screenshots/03-trip-detail-chronicle.png" width="100%" alt="Detalle del Viaje" /> |

### 🪙 Gabinete Numismático & Series Oficiales de Divisas
| Vitrina Numismática 3D Interactiva | Series Circulantes (Color / Blanco y Negro) |
| :---: | :---: |
| <img src="docs/screenshots/06-numismatic-cabinet.png" width="100%" alt="Gabinete Numismático" /> | <img src="docs/screenshots/04-numismatic-series.png" width="100%" alt="Series Circulantes" /> |

### 📖 Libro de Viaje Editorial & Pasaporte Digital
| Libro de Viaje Maquetado para Imprimir (PDF A4) | Pasaporte & Mapamundi SVG Interactivo |
| :---: | :---: |
| <img src="docs/screenshots/05-photobook-export.png" width="100%" alt="Libro de Viaje Editorial" /> | <img src="docs/screenshots/07-passport-worldmap.png" width="100%" alt="Pasaporte y Mapamundi" /> |

### 🔐 Pantalla de Inicio y Acceso Seguro
<p align="center">
  <img src="docs/screenshots/01-login.png" width="550" alt="Acceso Seguro con PIN" />
</p>

---

## 🌟 Características Destacadas

### 1. 🪙 Gabinete Numismático y Cono Monetario
* **Visor Flip Card 3D:** Tarjetas táctiles interactivas con giro de 180° a 60–120 fps en CSS 3D nativo, simulando una cápsula de colección.
* **Series Circulantes Oficiales:** Álbum predefinido de billetes y monedas vigentes en el país durante el año de visita. Las piezas conseguidas se muestran a todo color y las pendientes en escala de grises.
* **Ficha Técnica Detallada:** Denominación, año de emisión, divisa y notas sobre cómo y dónde se obtuvo cada pieza.

### 2. 📝 Crónica Diaria a Dos Voces
* **Doble Perspectiva:** Cada jornada permite a ambos miembros de la pareja escribir su versión de los hechos de forma simultánea e independiente.
* **Álbum de Recuerdos Integrado:** Subida múltiple de fotografías por destino con selección de foto de portada.

### 3. 🖨️ Exportador Editorial (Libro de Viaje)
* Genera una maqueta editorial limpia en formato libro lista para imprimir o guardar como PDF en A4.
* Incluye cabecera con fechas, clima registrado, desglose de inversión, crónicas a dos columnas, galería de fotos seleccionadas y colofón final personalizado.

### 4. 🌤️ Meteorología Histórica Automatizada
* Consulta automática a la API abierta de **Open-Meteo** para registrar las temperaturas mínimas y máximas históricas vividas en las fechas y destino de la expedición.

### 5. 🗺️ Mapamundi Interactivo & Pasaporte
* Visualización gráfica en mapa SVG con coloreado dinámico de países visitados.
* Métricas de pareja: países recorridos, días totales en ruta y total de piezas numismáticas coleccionadas.

### 6. 📱 PWA Offline-First
* Instalable en iOS y Android con soporte offline completo mediante Service Worker.
* Cola de sincronización local en IndexedDB con identificadores UUIDv7 para registrar vivencias y fotos en modo avión o sin cobertura.

---

## 🏗️ Arquitectura Técnica

```mermaid
flowchart TD
    subgraph Cliente ["Frontend (PWA Client)"]
        UI["React 19 + Tailwind CSS"]
        IDB["IndexedDB (Offline Queue)"]
        SW["Service Worker (Asset Caching)"]
        UI <--> IDB
    end

    subgraph Backend ["Fastify Server"]
        API["REST Endpoints (/api)"]
        AUTH["PIN Auth + scrypt + Rate Limiter"]
        SHARP["Sharp Image Pipeline (1 Worker Thread)"]
        WEATHER["Open-Meteo Integration"]
    end

    subgraph Almacenamiento ["Base de Datos & Archivos"]
        SQLITE["SQLite (WAL Mode)"]
        BACKUP["Automated Hot Backups (VACUUM INTO)"]
        MEDIA["/data/uploads (WebP Optimizados)"]
    end

    UI -->|HTTPS / WSS| API
    API --> AUTH
    API --> SHARP
    API --> WEATHER
    API --> SQLITE
    SQLITE --> BACKUP
    SHARP --> MEDIA
```

---

## 🚀 Despliegue Rápido con Docker

La forma más rápida de ejecutar Bitácora de Viajes en cualquier servidor o NAS doméstico:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Wacko87/bitacora-viajes.git
cd bitacora-viajes

# 2. Configurar variables de entorno (opcional)
cp .env.example .env

# 3. Iniciar con Docker Compose
docker compose up -d
```

La aplicación estará disponible inmediatamente en `http://localhost:3040`.

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución (`production` o `development`) | `production` |
| `PORT` | Puerto de escucha del servidor HTTP | `3040` |
| `HOST` | Interfaz de red de escucha | `0.0.0.0` |
| `DATA_DIR` | Ruta persistente para la base de datos y uploads | `/data` |
| `TRUST_PROXY` | IPs o subredes de confianza tras el proxy inverso | `127.0.0.1,172.16.0.0/12,192.168.0.0/16` |
| `ALLOWED_DOMAINS` | Dominios autorizados para solicitudes CORS (separados por coma) | `localhost` |
| `DEFAULT_PARTNER_1_NAME` | Nombre inicial para el Viajero 1 | `Viajero 1` |
| `DEFAULT_PARTNER_2_NAME` | Nombre inicial para la Viajera 2 | `Viajera 2` |
| `SEED_DEMO` | Inicializa la base de datos con viajes y monedas de ejemplo | `false` |

---

## 🔒 Seguridad y Resiliencia

* **Cifrado de PIN:** Las contraseñas y códigos PIN de acceso se almacenan utilizando `scrypt` con sales criptográficas únicas.
* **Control contra Ataques de Fuerza Bruta:** Limitación estricta de peticiones (`@fastify/rate-limit`) con tarpit exponencial.
* **Validación de Subidas:** Detección de tipos MIME reales mediante verificación de *magic bytes* para evitar ejecución de archivos maliciosos.
* **Copias de Seguridad en Caliente:** Respaldos periódicos automáticos de SQLite mediante `VACUUM INTO` sin bloquear las lecturas/escrituras.
* **Cabeceras de Seguridad:** Políticas estrictas de `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy`.

---

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor backend y frontend en desarrollo
npm run dev

# Opcional: Cargar datos de demostración
npm run db:seed:demo

# Compilar para producción
npm run build
```

---

## 🤝 Contribuciones

Las sugerencias, reportes de errores y pull requests son bienvenidos. Siéntete libre de abrir un issue para proponer nuevas funcionalidades o mejoras en el gabinete numismático.
