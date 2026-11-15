# ExaNova – Deployment Guide (Vercel & Neon PostgreSQL)

**Application:** ExaNova – Smart College Examination & Assessment System  
**Tagline:** Smart Examination for a Smarter Future.  
**Developer:** Durjodhan Mondal ([info@ticollege.ac.in](mailto:info@ticollege.ac.in))  
**Organization:** Techno Main Salt Lake, Kolkata, India  
**Target Platform:** Vercel Serverless Functions (`@vercel/node`)  
**Target Database:** Neon Serverless PostgreSQL with Connection Pooling

---

## 1. Prerequisites
- Node.js LTS (v20+ recommended)
- Neon PostgreSQL Account (or AWS RDS / Supabase with connection pooling)
- Vercel CLI (`npm i -g vercel`) or Git integration via GitHub
- GitHub Repository: [https://github.com/Durjodhan45](https://github.com/Durjodhan45)

---

## 2. Environment Variables Configuration

Set up the following variables in Vercel Project Settings > Environment Variables:

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `NODE_ENV` | Application environment | `production` |
| `PORT` | Listening port (used in standard Node runtime) | `3000` |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | `postgresql://neondb_owner:<pwd>@ep-blue-bar-aozdvxlz-pooler.c-2.ap-southeast-1.aws.neon.tech/exanova-db?sslmode=require` |
| `DB_SSL` | Enable SSL for remote database | `true` |
| `DB_POOL_MAX` | Max pool size per serverless invocation | `5` |
| `JWT_SECRET` | Secret key for JWT access tokens | `your-cryptographic-access-secret-32-chars-min` |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `your-cryptographic-refresh-secret-32-chars-min` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` |
| `CORS_ORIGIN` | Allowed Frontend URL(s) comma separated | `https://exanova.vercel.app,http://localhost:5173` |
| `ENABLE_SWAGGER` | Enable Swagger docs in production | `true` |

---

## 3. Database Migration and Seeding

Before running traffic through Vercel serverless functions, execute TypeORM migrations and initial admin / demo seeds on the live database from your deployment pipeline or local terminal:

```bash
# 1. Run TypeORM Migrations against Neon PostgreSQL
npm run migration:run

# 2. Seed Default Administrator and Academic Demo Data
npm run seed:demo
```

### Verified Default Credentials Seeded:
- **Admin:** Username: `admin` | Password: `Admin@12345`
- **Faculty:** Username: `faculty01` | Password: `Faculty@12345`
- **Student:** Roll Number: `230001` | Password: `Student@12345`

---

## 4. Vercel Architecture & Deployment

ExaNova uses a serverless entry point located at `api/index.ts` configured in `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 60,
        "memory": 1024
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

### Deploying via Vercel CLI
```bash
# Login to Vercel
vercel login

# Link and deploy preview
vercel

# Deploy to production
vercel --prod
```

### Deploying via GitHub Git Integration
1. Push repository commits to GitHub: `git push origin main`.
2. Connect repository in [Vercel Dashboard](https://vercel.com/new).
3. Set Framework Preset to **Other** (or **NestJS**).
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Add Environment Variables listed above.
7. Click **Deploy**.

---

## 5. Serverless Optimization & PostgreSQL Connection Pooling

- **Connection Pool Exhaustion Prevention:**
  In serverless environments (Vercel), each concurrent function invocation can open a database connection. Neon provides a built-in connection pooler on port 5432 or with `-pooler` in the endpoint host (e.g. `ep-blue-bar-aozdvxlz-pooler...`). ExaNova limits `DB_POOL_MAX` to `5` to ensure total pooled connections remain strictly within Neon limits.
- **Cold-Start Latency:**
  NestJS application bootstrap is cached across warm lambda invocations in `api/index.ts` via singleton Express instance memoization (`if (!isAppInitialized) { await bootstrap(); }`).
- **Memory Buffer Document Processing:**
  Vercel serverless functions do not provide persistent local disk storage. All DOCX and XLSX question parsing, Excel grade sheets, and PDF scorecards are generated and streamed directly via in-memory buffers.
