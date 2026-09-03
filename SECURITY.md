# Security Policy

## Reporting a vulnerability

Do not open a public issue containing credentials, personal data or exploit
details. Report security concerns privately to `contato@liggasst.com.br`.

## Credential rules

- `VITE_*` variables are public and are embedded in the browser bundle.
- Database passwords, service-role keys and private keys must only exist in a
  server-side secret manager.
- The browser must access protected data through Supabase with Row Level
  Security or through an authenticated backend API.
- Rotate a credential immediately if it is committed, logged or shared.
- Run `npm run check:secrets` before each commit.
