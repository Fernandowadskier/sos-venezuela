# Despliegue en producción — Crisis Venezuela App
### Tiempo estimado: 30-45 minutos

---

## PASO 1 — Supabase (Base de datos + Storage)

1. Ve a https://supabase.com y crea una cuenta (gratis)
2. Clic en **"New Project"**
   - Nombre: `venezuela-crisis`
   - Password: elige una segura (guárdala)
   - Región: elige la más cercana (US East o similar)
3. Espera ~2 minutos mientras Supabase crea el proyecto

4. Ve a **SQL Editor** → **New Query**
5. Copia y pega el contenido de `supabase-schema.sql`
6. Clic en **"Run"** — verás las tablas creadas

7. Ve a **Storage** → **New Bucket**
   - Name: `crisis-photos`
   - Public bucket: **ON** (muy importante)
   - Clic en **Save**

8. Copia tus credenciales desde **Settings → API**:
   - `Project URL` → será tu `VITE_SUPABASE_URL`
   - `anon / public key` → será tu `VITE_SUPABASE_ANON_KEY`

---

## PASO 2 — Mapbox (Mapa)

1. Ve a https://mapbox.com y crea una cuenta (gratis)
2. Ve a tu perfil → **Tokens**
3. Usa el token **Default public token** (empieza con `pk.`)
   → será tu `VITE_MAPBOX_TOKEN`

---

## PASO 3 — GitHub (para deploy a Vercel)

1. Crea un repositorio en https://github.com (puede ser privado)
2. Sube todos los archivos de esta carpeta al repositorio:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

---

## PASO 4 — Vercel (Hosting)

1. Ve a https://vercel.com y crea cuenta (gratis, puede ser con tu cuenta GitHub)
2. Clic en **"Add New Project"**
3. Importa el repositorio de GitHub que acabas de crear
4. En la sección **Environment Variables**, agrega las 3 variables:

   | Variable | Valor |
   |----------|-------|
   | `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |
   | `VITE_MAPBOX_TOKEN` | `pk.eyJ1Ijo...` |

5. Clic en **"Deploy"**
6. En ~2 minutos tienes la app live en `https://tu-proyecto.vercel.app`

---

## Dominio personalizado (opcional)

En Vercel: **Settings → Domains** → agrega tu dominio (ej: `crisis-ve.com`)

---

## Desarrollo local (para hacer cambios)

```bash
# Instalar dependencias
npm install

# Crear archivo de variables locales
cp .env.example .env.local
# Edita .env.local con tus credenciales reales

# Ejecutar en desarrollo
npm run dev
# → Abre http://localhost:5173

# Build para producción
npm run build
```

---

## Estructura de la app

```
src/
├── App.jsx                    # Mapa principal + lógica central
├── lib/
│   └── supabase.js            # Cliente Supabase + upload de fotos
└── components/
    ├── BuildingPanel.jsx      # Panel lateral con detalles de edificación
    ├── AddBuildingModal.jsx   # Formulario para reportar edificación
    └── AddPersonModal.jsx     # Formulario para reportar desaparecido
```

---

## Actualizaciones en tiempo real

La app usa **Supabase Realtime**: cuando alguien agrega una edificación
o persona desde cualquier dispositivo, el mapa se actualiza automáticamente
para todos los usuarios conectados — sin recargar la página.

---

## Escalabilidad

- Supabase Free: hasta 500MB de base de datos, 1GB de Storage, ilimitadas lecturas
- Vercel Free: ilimitadas visitas, sin restricciones de tráfico
- Para crisis a gran escala: Supabase Pro ($25/mes) soporta millones de registros

---

*Hecho con urgencia. Que sirva para salvar vidas.*
