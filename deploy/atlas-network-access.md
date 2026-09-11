# MongoDB Atlas — Production Network Access (static-IP, not 0.0.0.0/0)

**Goal:** the deployed backend connects to Atlas over a *stable* egress IP that you
allowlist **once**. You should never have to add your laptop's changing IP again,
and the database is **never** opened to the whole internet (`0.0.0.0/0`).

Credentials (`MONGODB_URI`, DB user/password) live only in
`deploy/env/backend.env.prod` on the VM — never in source, frontend bundles,
logs, or Git. See `backend.env.prod.example`.

---

## Why NOT 0.0.0.0/0

`0.0.0.0/0` allowlists **every IP on the internet**. Even though a username +
password is still required, it removes the network layer entirely, so a leaked
or brute-forced credential is directly reachable by anyone, anywhere. For a
system holding pet-owner PII and veterinary records that is an unacceptable
default. We only fall back to it as a last resort (see the very bottom) and only
with the caveats spelled out there.

The correct production posture is: **one fixed IP (the VM's), allowlisted once.**

---

## Option A — Single VM with a static/reserved public IP (matches our deploy)

This is the recommended path for the single-VM + Docker Compose deployment.

1. **Give the VM a static (reserved) public IP** so it never changes on reboot:
   - **AWS EC2:** allocate an **Elastic IP** and associate it with the instance.
   - **GCP Compute Engine:** reserve a **static external IP** and attach it.
   - **Azure VM:** create a **Static** Public IP (Standard SKU) and attach it.
   - **DigitalOcean / Hetzner / Linode:** attach a **Reserved / Floating IP**.

   Note the resulting IPv4 address, e.g. `203.0.113.45`.

2. **Confirm the VM actually egresses from that IP.** SSH into the VM and run:
   ```bash
   curl -s https://api.ipify.org; echo
   ```
   It must print the same address you reserved. (On most single-NIC cloud VMs
   the inbound reserved IP is also the outbound IP. If it differs — e.g. behind a
   NAT gateway — allowlist the **outbound** address, or use Option B.)

3. **Allowlist that one IP in Atlas:**
   Atlas → your Project → **Network Access** → **IP Access List** →
   **Add IP Address** → enter `203.0.113.45/32` → add a comment like
   `vetflow-prod-vm` → **Confirm**.
   The `/32` suffix means *exactly this one address*.

4. **Remove stale entries.** Delete any leftover personal/laptop IPs and — most
   importantly — any `0.0.0.0/0` entry that may have been added during testing.

5. **Create a least-privilege DB user** (Atlas → Database Access):
   role **readWrite** on the `medflow` database only (not Atlas admin). Put that
   user + password into `MONGODB_URI` in `backend.env.prod`.

Done. The VM's IP is fixed, so this list never needs touching again.

---

## Option B — Egress via a NAT gateway with a fixed IP (scales to >1 host)

Use this if you later run multiple app hosts / an autoscaling group and want a
single stable egress IP for all of them.

- **AWS:** put app hosts in a private subnet behind a **NAT Gateway** that uses
  an Elastic IP; allowlist that EIP `/32`.
- **GCP:** configure **Cloud NAT** with a reserved external IP; allowlist it.
- **Azure:** attach a **NAT Gateway** with a static Public IP; allowlist it.

All instances then share one predictable egress IP regardless of scaling.

---

## Option C — VPC / Private Peering (largest / most locked-down setups)

Atlas supports **VPC Peering** and **Private Endpoint (AWS PrivateLink / GCP
Private Service Connect / Azure Private Link)**. Traffic never touches the public
internet and you don't manage an IP allowlist at all. This needs a paid Atlas
tier (M10+) and more networking setup — overkill for the current single-VM
deploy, but the clean answer at larger scale.

---

## Verify connectivity from the VM (before running the full stack)

The backend already sets DNS to Cloudflare (`1.1.1.1`) and uses a 10s server
selection timeout (`backend/src/config/database.ts`). To sanity-check the URI +
allowlist independently of the app:

```bash
# quick DNS check that the SRV record resolves
nslookup -type=SRV _mongodb._tcp.cluster.example.mongodb.net 1.1.1.1

# optional: full connectivity test with mongosh (if installed)
mongosh "mongodb+srv://USER:PASSWORD@cluster.example.mongodb.net/medflow" \
  --eval 'db.runCommand({ ping: 1 })'
```

A successful `{ ok: 1 }` ping means the IP is allowlisted and the credentials
work. If it hangs or times out, the IP is almost always not (correctly)
allowlisted, or the egress IP differs from what you added (re-check step 2).

---

## Absolute last resort (avoid): 0.0.0.0/0

Only if your platform genuinely cannot provide any stable egress IP (some
ephemeral PaaS free tiers) would you use `0.0.0.0/0`. If you are ever forced
into it, you must compensate at the credential/data layer:

- a long, randomly generated DB password, rotated regularly;
- a least-privilege DB user (readWrite on `medflow` only);
- enable Atlas auditing/alerts and watch for anomalous connections.

The single-VM deployment in this repo is specifically designed so you do **not**
need this — Option A gives you one fixed IP allowlisted once.
