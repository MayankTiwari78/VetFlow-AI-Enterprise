# VetFlow-AI — Production Deployment Runbook (single VM + Docker Compose)

This is the **ordered, copy-pasteable** runbook for deploying the full stack —
backend (Node + Python inference), pet-owner web app, veterinarian/admin console,
MongoDB Atlas, and a Caddy reverse proxy with automatic HTTPS — onto **one VM**.

> The companion Word document (`VetFlow-AI_Production_Deployment_Plan.docx`)
> explains the *why* behind every choice (architecture, security, the Python
> serving fix, the Atlas static-IP decision, 20 validation checks, rollback).
> This README is the *how*. Nothing here commits or pushes to Git.

Files referenced below all live in this `deploy/` folder unless noted:

```
backend/Dockerfile.prod              # Node + Python venv (Stage-1 & Stage-2 inference)
backend/ml-requirements.txt          # pinned Python deps (sklearn 1.7.2, torch cpu, ...)
deploy/docker-compose.prod.yml       # the 4 services (backend, frontend, admin, caddy)
deploy/Caddyfile                     # subdomain routing + auto-HTTPS
deploy/.env.example                  # compose interpolation vars (public, no secrets)
deploy/env/backend.env.prod.example  # backend secrets template (fill on the VM)
deploy/env/frontend.env.prod.example # (manual builds only; Docker uses build args)
deploy/env/admin.env.prod.example    # (manual builds only; Docker uses build args)
deploy/atlas-network-access.md       # MongoDB Atlas static-IP allowlist steps
```

---

## 0. Prerequisites (once)

- A VM (2 vCPU / 4 GB RAM minimum; torch CPU + two Next.js apps + Node).
  4 vCPU / 8 GB is comfortable. Ubuntu 22.04/24.04 LTS assumed.
- A **static/reserved public IP** on the VM — see `atlas-network-access.md` §A.
- A **domain** you control, with three DNS **A records** pointing at that IP:
  `api.<domain>`, `app.<domain>`, `admin.<domain>`.
- A **MongoDB Atlas** cluster + a least-privilege DB user.
- Accounts/keys for the services the app actually uses: Cloudinary (image
  storage), Razorpay + Stripe (payments), and an SMTP provider (email).
- Docker Engine + Compose plugin on the VM:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"   # log out/in so docker runs without sudo
  docker compose version            # confirm the compose plugin is present
  ```

---

## 1. Get the code + Stage-2 CV weights onto the VM

```bash
# your app repo (whatever remote you use)
git clone <your-repo-url> vetflow && cd vetflow
```

The workspace layout the compose file expects (Stage-2 CV sits next to the app):

```
vetflow/
├─ MedFlow-AI-Enterprise/     # backend, frontend, admin, deploy/
└─ reference-ml/stage2_cv/    # Stage-2 code + checkpoints/*.pt  (git-ignored, ~70MB)
```

The Stage-2 checkpoints (`reference-ml/stage2_cv/checkpoints/<head>_finetune_best.pt`)
are **git-ignored** and are **not** baked into the image — they are **mounted**
read-only into the backend container. The bridge (`backend/ml/cv_predict_bridge.py`)
imports `inference/cv_predict.py`, which in turn needs the WHOLE `stage2_cv`
tree (`inference/`, `models/`, `evaluation/`, `preprocessing/`, `training/`,
`configs/`), so copy the ENTIRE directory out-of-band — excluding local
virtualenvs, caches and dataset payloads that inference never reads:

```bash
# from your machine, into the VM (adjust paths/host)
# rsync the whole stage2_cv tree, WITHOUT the excluded heavy/irrelevant dirs
rsync -av \
  --exclude '.venv-stage2' \
  --exclude '__pycache__' \
  --exclude '.pytest_cache' \
  --exclude 'data/' \
  reference-ml/stage2_cv \
  user@<VM_IP>:~/vetflow/reference-ml/
```

(No rsync on Windows? `scp -r reference-ml/stage2_cv user@<VM_IP>:~/vetflow/reference-ml/`
also works — it just copies the local caches too, which is harmless.)

Verify the code tree AND the checkpoints exist before continuing:
```bash
ls reference-ml/stage2_cv/{inference,models,evaluation,preprocessing,training}
ls -lh reference-ml/stage2_cv/checkpoints/*_finetune_best.pt
```
> If the code tree is missing, Stage-2 image analysis fails with "AI image
> assessment is not available on this server." If a head's checkpoint is
> missing, that species' image analysis fails; the Stage-1 symptom path is
> unaffected. Stage-1's model (`backend/ml/vetflow_model_v1_1.pkl`, ~1.6 KB)
> **is** committed, so it needs no copy step.

---

## 2. MongoDB Atlas network access (the static-IP fix)

Follow **`atlas-network-access.md`** now. In short: reserve/confirm the VM's
egress IP, allowlist it as `<IP>/32` in Atlas → Network Access, delete any
laptop IPs and any `0.0.0.0/0` entry, and create a `readWrite`-on-`medflow`
user. Confirm with the `mongosh ... ping` test at the bottom of that doc.

---

## 3. Fill environment files on the VM

```bash
cd MedFlow-AI-Enterprise/deploy

# 3a. compose-level public vars
cp .env.example .env
#    edit .env: PUBLIC_API_URL=https://api.<domain>, PUBLIC_RAZORPAY_KEY_ID,
#    PUBLIC_CURRENCY, and STAGE2_CV_HOST_PATH if reference-ml is not the default
#    ../../reference-ml/stage2_cv.

# 3b. backend secrets (git-ignored; never commit the filled file)
cp env/backend.env.prod.example env/backend.env.prod

# generate three DISTINCT strong secrets:
openssl rand -base64 48   # -> JWT_ACCESS_SECRET
openssl rand -base64 48   # -> JWT_REFRESH_SECRET (must differ from access)
openssl rand -base64 48   # -> TWO_FACTOR_ENCRYPTION_KEY (>=32 bytes)
openssl rand -base64 24   # -> ADMIN_PASSWORD (strong, unique — NOT Tiwari@1234)
```

Edit `env/backend.env.prod` and set **every** value: `MONGODB_URI` (Atlas SRV),
the three JWT/2FA secrets above, `CLIENT_URL=https://app.<domain>`,
`ADMIN_URL=https://admin.<domain>`, `COOKIE_SAME_SITE=lax`, real Cloudinary /
Razorpay / Stripe / SMTP values, and a strong `ADMIN_PASSWORD`.

> The backend **refuses to boot** in production if any required field is missing,
> still a `replace-with-...` placeholder, or if the two JWT secrets are equal
> (enforced in `backend/src/config/env.ts`). Keep the hardening flags off:
> `ENABLE_API_DOCS=false`, `DEVELOPMENT_AUTO_VERIFY_EMAIL=false`,
> `ALLOW_PHASE2C_DEMO_SEED=false`, `STAGE3_LLM_ENABLED=false`.

Lock down permissions on the filled secret file:
```bash
chmod 600 env/backend.env.prod
```

---

## 4. Point Caddy at your real domain

Edit `deploy/Caddyfile`: replace `example.com` with your domain and
`admin@example.com` with a real email (Let's Encrypt expiry notices). The three
site blocks (`api.`, `app.`, `admin.`) should already match your DNS records.

> Because all three are subdomains of one domain, browser traffic is
> "same-site", so the httpOnly refresh cookies (`SameSite=lax`) flow correctly
> between the web apps and the API. Don't split the API onto an unrelated domain
> unless you also switch `COOKIE_SAME_SITE=none` (see the plan .docx).

---

## 5. Build & start the stack

```bash
cd MedFlow-AI-Enterprise/deploy

docker compose -f docker-compose.prod.yml build      # first build pulls torch cpu; slow
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps          # all services healthy/running?
```

Watch logs on first boot (Caddy issuing certs, backend connecting to Atlas):
```bash
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 6. Smoke test (fast sanity before the full 20-check pass)

```bash
# backend health via Caddy (real cert)
curl -s https://api.<domain>/health

# web apps respond
curl -sI https://app.<domain>    | head -n1
curl -sI https://admin.<domain>  | head -n1
```

Then run the **20 end-to-end validation checks** in the deployment plan .docx
(register → verify email → login → 2FA → add pet → Stage-1 symptom report →
Stage-2 image report → Stage-3 fused AIReport with `veterinarianReviewRequired=true`
→ vet review queue at `/veterinary-review-queue` → vet dashboard at
`/veterinarian-dashboard` → owner routes `/pet-owner`, `/pet-owner/pets`,
`/pet-owner/ai-reports` → payments → logout/refresh-cookie behavior, etc.).

---

## Operations cheat-sheet

```bash
# update to newer code
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# rollback to a known-good commit (images rebuild from that code)
git checkout <good-commit>
docker compose -f docker-compose.prod.yml up -d --build

# stop / restart
docker compose -f docker-compose.prod.yml down          # stop (Atlas data untouched)
docker compose -f docker-compose.prod.yml restart backend

# tail logs
docker compose -f docker-compose.prod.yml logs -f backend
```

> `down` only stops containers — your data is in **Atlas**, not in a local
> volume, so it is never dropped by compose lifecycle commands. Do **not** run
> destructive Mongo migrations/seeds against the production database.

---

## Security reminders

- Never commit `deploy/.env`, `deploy/env/backend.env.prod`, or any filled
  secret. Only the `*.example` templates belong in Git.
- Rotate the bootstrap `ADMIN_PASSWORD` and do not reuse the legacy
  `Tiwari@1234` value that appears in the old committed `.env.example` /
  git history.
- Keep MongoDB on a **`/32` allowlist**, not `0.0.0.0/0` (see
  `atlas-network-access.md`).
- Secrets live only in `backend.env.prod` on the VM — never in source, the two
  `NEXT_PUBLIC_*` client bundles, logs, or Git.
