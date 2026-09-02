# Academia de Béisbol

Sistema de gestión para una academia de béisbol: alumnos, pagos mensuales, horarios
y panel tipo marcador. Clonado del prototipo JSX y respaldado por **Supabase**
(datos en la nube, acceso con usuarios y roles admin/coach).

Stack: Vite + React + TypeScript + Tailwind + `@supabase/supabase-js` + lucide-react.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # pega tu URL y anon key de Supabase
npm run dev
```

### Conectar Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com).
2. En **Project Settings → API** copia la _Project URL_ y la _anon/publishable key_.
3. Pégalas en `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxx
   ```
4. En **SQL Editor**, pega y ejecuta `supabase/migrations/0001_init.sql`.
5. Reinicia `npm run dev`.

### Cuentas

- La **primera** cuenta que se registra queda como **admin** (automático).
- Las siguientes quedan como **coach**; un admin ajusta el rol en la pestaña
  **Usuarios**.
- El admin también puede subir un **logo** y cambiar el nombre en **Ajustes**.

## Estructura

- `src/features/` — Panel, Alumnos, Pagos, Horarios, Usuarios, Ajustes, Login.
- `src/lib/` — cliente Supabase, auth, tipos y capa de datos (`db.ts`).
- `supabase/migrations/` — esquema SQL con RLS.
