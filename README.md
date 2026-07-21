# Suporte TI CTE

Sistema completo de suporte técnico interno e base de conhecimento.

## Arquitetura
- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Frontend:** React, Vite
- **Deploy:** Docker, Docker Compose

## Pré-requisitos
- Docker e Docker Compose instalados.
- Gerenciador de Proxy Reverso (Nginx Proxy Manager recomendado).

## Como rodar localmente (Desenvolvimento)

1. **Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Suba um banco Postgres localmente na porta 5432
   npx prisma migrate dev
   node prisma/seed.js
   npm run dev
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Deploy via Portainer (Produção)

1. No Portainer, vá em **Stacks > Add stack**.
2. Escolha **Repository**.
3. Insira a URL do repositório GitHub (`https://github.com/AnthonyPerotti/suporte-ti-cte`).
4. Ative **GitOps updates** com Polling ou Webhook.
5. Em **Environment variables**, configure pelo menos as seguintes variáveis para sobrescrever o `docker-compose.yml`:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `POSTGRES_PASSWORD`
   - Configurações SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)

> [!NOTE]
> O frontend precisa saber a URL da API durante o build. O `docker-compose.yml` está configurado para passar `VITE_API_URL=http://suporteti.cte/api`. Se você for usar outro domínio, altere essa variável no compose.

6. Configure o Nginx Proxy Manager (NPM):
   - **Domain Name:** `suporteti.cte`
   - **Forward Hostname/IP:** IP do host Docker
   - **Forward Port:** `8080` (porta exposta do frontend no compose)
   - Vá na aba **Custom locations**:
     - `Location`: `/api`
     - `Forward Hostname/IP`: IP do host Docker
     - `Forward Port`: `3001` (porta do backend)
     - `Scheme`: `http`

## Credenciais Iniciais (Seed)
Ao rodar a stack pela primeira vez, o banco será populado com:
- **Admin:** `admin@cead.ufsm.br` / `Admin@123`
- **Técnico:** `tecnico@cead.ufsm.br` / `Temp@123` (exige troca no 1º login)
- **Usuário:** `usuario@cead.ufsm.br` / `Temp@123` (exige troca no 1º login)
