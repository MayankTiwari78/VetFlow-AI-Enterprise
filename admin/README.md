# VetFlow-AI Admin And Veterinarian Portal

The administrator and doctor portal uses Next.js App Router. It preserves administrator dashboards, appointment and doctor management, organization memberships, audit logs, 2FA/session security, doctor dashboards, appointments, and profile routes. Visibility controls are convenience only; all permissions and tenant boundaries remain enforced by the API.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

Set `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_CURRENCY` in a local `.env` using `.env.example` placeholders. Do not place credentials or private keys in `NEXT_PUBLIC_*` configuration.

The production build uses Next standalone output. Local Compose instructions are in [../docs/deployment.md](../docs/deployment.md).
