# Mindmap Project (React + Spring Boot + MongoDB + Cognito)

## Quick Start (Dev)
1. Fill `.env` values in your shell (or export) for docker compose:
   ```bash
   export COGNITO_USER_POOL_ID=ap-southeast-2_xxxxx
   export COGNITO_AUDIENCE=${COGNITO_CLIENT_ID} # typically your frontend app client id
   export COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
   export COGNITO_DOMAIN=your-domain.auth.ap-southeast-2.amazoncognito.com
   ```
2. `docker compose -f infra/docker-compose.dev.yml up --build`

- FE: http://localhost:3000
- API: http://localhost:8081

### Cognito Setup (Outline)
- Create a User Pool (ap-southeast-2). Enable username/email sign-in.
- Create App Client A (Frontend): **No secret**, PKCE enabled. Add Hosted UI domain.
  - Callback: `http://localhost:3000/callback`
  - Allowed logout URL: `http://localhost:3000/`
  - Scopes: `openid email profile`
- Create App Client B (Backend) if you need server-to-server operations.
- (Optional) Add Google IdP, then enable on App Client A.

### Security
- Backend validates JWT using JWKS (`COGNITO_JWK_SET_URI`) and checks issuer/audience.
- CSRF is enabled with cookie tokens.
- Basic IP rate-limiting via Bucket4j filter.
- Nginx serves FE and proxies `/api` to backend.
- Use HTTPS in prod by terminating TLS at your ingress / load balancer.

### User Stories covered
- Management: list, create, open, rename, delete (+confirm).
- Editor: root auto-create, add child (Tab), add sibling (Enter), delete (Del), edit text (dblclick), drag, zoom, pan, full-screen.
- Auth: login/logout; forgot password flows are handled by Cognito Hosted UI.

