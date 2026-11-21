# Concepts Brief: Bitácora de Viajes en Pareja & Gabinete Numismático

**Stack**: PWA Mobile-first (React 19 + TypeScript + Vite + Tailwind CSS) + Fastify 5 REST API + SQLite WAL
**Despliegue**: Docker autónomo en puerto 3040 tras Nginx Proxy / Caddy con SSL.

---

## 1. Visión y Propósito del Producto

Una Progressive Web App (PWA) privada, ágil y autónoma, diseñada exclusivamente para dos personas que viajan juntas. Su objetivo es capturar y revivir tanto los **recuerdos vivenciales** como los **recuerdos tangibles y numismáticos** (billetes, monedas, tickets, postales), eliminando la fatiga de registro en plena ruta vacacional.

Pilares centrales:
1. **Gabinete Numismático & Scrapbook Unificado (`artifacts`):** Colección de monedas, billetes y recuerdos físicos con visor 3D anverso/reverso, siluetas de divisas pre-cargadas y captura ultrarrápida.
2. **Modo Dual de Captura (TRIZ):**
   * *Modo Ruta (5 segundos):* Foto con nivel giroscópico cenital, selección visual de divisa en 1 toque y guardado inmediato sin teclear.
   * *Modo Gabinete (Hotel/Casa):* Edición pausada de anécdotas, fotos del reverso y detalles de ceca/año.
3. **Diario de Viaje a Dos Voces:** Crónica cronológica por día con notas independientes para Perfil A y Perfil B.
4. **Pasaporte & Mapa Mundial:** Mapa interactivo con países recorridos y estadísticas de pareja (días en ruta, total de divisas).

---

## 2. Resoluciones Arquitectónicas EGM

* **Sincronización Offline PWA (Resolución de EGM-01 y EGM-02):**
  - Ante la falta de soporte de `Background Sync` en iOS Safari, se implementa una **cola en primer plano en IndexedDB** con sincronización reactiva en eventos `online`, `visibilitychange` y botón de sincronización manual con badge visual.
  - Generación de claves primarias mediante **UUIDv7** en cliente, garantizando ordenación temporal e inserciones idempotentes sin colisión de IDs en modo avión.
* **Ingesta Multimedia Optimizada (Resolución de EGM-06):**
  - Pre-compresión obligatoria en el cliente con `OffscreenCanvas`: imágenes redimensionadas a máx. 1600px en WebP (~350 KB) antes de guardarse en IndexedDB o enviarse al servidor, evitando saturación de memoria RAM en el backend y timeouts en subidas móviles.
* **Modelo de Datos Unificado (Resolución de EGM-07):**
  - Fusión de monedas, billetes y recuerdos en una única entidad `artifacts` (`category: 'coin' | 'banknote' | 'ticket' | 'postcard' | 'other'`), reduciendo el esquema a 4 tablas maestras (`profiles`, `trips`, `artifacts`, `trip_logs`).
* **Seguridad y Resiliencia Homelab (Resolución de EGM-04 y EGM-08):**
  - Rate limiting estricto en Fastify para el PIN (máximo 5 intentos cada 15 min + tarpit).
  - Manejo de señales POSIX (`SIGTERM`) con checkpoint forzado `PRAGMA wal_checkpoint(TRUNCATE)` y cierre limpio antes del timeout de Docker en Unraid.
  - Almacenamiento mapeado al pool físico NVMe (`/mnt/cache/...`) para evitar bloqueos del sistema de archivos FUSE `shfs`.

---

## 3. Esquema de Datos Consolidado (SQLite WAL)

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY, -- UUIDv7
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trips (
  id TEXT PRIMARY KEY, -- UUIDv7
  title TEXT NOT NULL,
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2 (ej. 'JP', 'MA')
  city TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- 'active', 'completed', 'planned'
  summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY, -- UUIDv7
  trip_id TEXT REFERENCES trips(id),
  collector_profile_id TEXT REFERENCES profiles(id),
  category TEXT NOT NULL, -- 'coin', 'banknote', 'ticket', 'postcard', 'souvenir'
  title TEXT NOT NULL,
  currency_code TEXT,    -- ej. 'JPY', 'USD' (opcional para monedas/billetes)
  denomination TEXT,     -- ej. '500', '20' (opcional)
  year INTEGER,          -- año de acuñación o emisión (opcional)
  image_front TEXT NOT NULL,
  image_back TEXT,       -- opcional (para reverso de monedas/billetes)
  story TEXT,            -- anécdota o contexto de obtención
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

CREATE TABLE trip_logs (
  id TEXT PRIMARY KEY, -- UUIDv7
  trip_id TEXT NOT NULL REFERENCES trips(id),
  day_number INTEGER,
  log_date DATE NOT NULL,
  title TEXT,
  notes_partner_1 TEXT,
  notes_partner_2 TEXT,
  photos TEXT, -- JSON array de URLs de fotos del día
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);
```
