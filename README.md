# ✈️ Bitácora de Viajes en Pareja & Gabinete Numismático

> Progressive Web App (PWA) moderna, privada y autoalojada diseñada para parejas que viajan juntas. Permite documentar cada aventura (crónica compartida a dos voces), registrar costes e inclusiones, consultar el clima histórico del destino, gestionar álbumes fotográficos con portadas personalizadas, imprimir un elegante libro de viaje editorial y coleccionar recuerdos tangibles en un gabinete numismático interactivo 3D.

---

## 🌟 Características Principales

### 1. 🪙 Gabinete Numismático (Billetes y Monedas Circulantes)
* **Visor Flip Card 3D:** Volteo interactivo anverso/reverso a 60–120 fps con perspectiva CSS 3D.
* **Series Circulantes Oficiales:** Álbum visual del cono monetario vigente en el año de visita (billetes y monedas). Modo blanco y negro para piezas pendientes y color para las conseguidas.
* **Ficha de Colección:** Denominación, año de acuñación/emisión, material, dimensiones e historia vivencial de cada pieza.

### 2. 📖 Crónica Diaria a Dos Voces & Libro de Viaje
* **Doble Perspectiva:** Registro diario con apartados simultáneos e independientes para cada miembro de la pareja.
* **Exportador Editorial (Libro de Viaje):** Generador de maquetación limpia en formato libro listo para imprimir o guardar como PDF en A4.

### 3. 🗺️ Mapamundi Interactivo & Pasaporte
* **Mapa SVG Interactivo:** Países visitados coloreados automáticamente con desglose por regiones mundiales.
* **Sellos de Pasaporte:** Contador de países, monedas conseguidas y días en ruta.

### 4. 🌤️ Clima Histórico Automático
* Cálculo automático de temperaturas mínimas y máximas registradas en la ciudad y fechas del viaje mediante la API abierta de Open-Meteo.

### 5. 💰 Gestión de Presupuesto e Inclusiones
* Registro de inversión total del viaje, divisa, notas de costes y selección rápida de servicios incluidos (vuelos, alojamiento, excursiones, alquiler de coche, seguro, etc.).

### 6. 📱 PWA Offline-First
* Diseñada para móviles (iOS y Android) y escritorio.
* Cola de sincronización local (IndexedDB) con UUIDv7 para registrar experiencias en modo avión o sin cobertura.

### 7. 🛡️ Seguridad y Resiliencia
* Autenticación por PIN de acceso con cifrado `scrypt`.
* Protección contra fuerza bruta (Rate limiting estricto).
* Secretos de sesión de 256 bits generados automáticamente.
* Cabeceras de seguridad HTTP (CSP, X-Frame-Options, HSTS).
* Validación estricta de subidas mediante magic bytes.
* Copias de seguridad atómicas en caliente con SQLite `VACUUM INTO`.

---

## 🏗️ Arquitectura Técnica

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti.
* **Backend:** Node.js con Fastify 5 REST API.
* **Almacenamiento:** SQLite nativo en modo WAL con checkpoints automáticos.
* **Optimización Multimedia:** Pipeline `sharp` para generación de miniaturas y vistas web optimizadas.

---

## 🚀 Despliegue Rápido con Docker

La forma más sencilla de ejecutar la aplicación es utilizando Docker Compose:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Wacko87/bitacora-viajes.git
   cd bitacora-viajes
   ```

2. Configura las variables de entorno (opcional):
   ```bash
   cp .env.example .env
   ```

3. Inicia el contenedor:
   ```bash
   docker compose up -d
   ```

4. Abre tu navegador en `http://localhost:3040`.

---

## 🛠️ Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar en modo desarrollo
npm run dev

# 3. Opcional: Cargar datos de prueba (Tokio y Roma)
npm run db:seed:demo

# 4. Compilar para producción
npm run build
```

---

## 📄 Licencia

Este proyecto está disponible bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.
