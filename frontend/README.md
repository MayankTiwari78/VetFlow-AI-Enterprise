# MedFlow AI Patient App

The patient client uses Next.js App Router. It preserves the appointment discovery and booking, profile, payment verification, email verification, password recovery, OTP, TOTP login, recovery-code, session, and account-security routes from the prior client.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Set `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` in a local `.env` using `.env.example` placeholders. Values prefixed `NEXT_PUBLIC_` are intentionally browser-visible; never place private secrets in this client configuration.

The production build uses Next standalone output. Local Compose instructions are in [../docs/deployment.md](../docs/deployment.md).
