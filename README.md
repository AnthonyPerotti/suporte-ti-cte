# Suporte TI CTE

Sistema completo de suporte técnico interno e base de conhecimento.

## Recursos Principais
- **Abertura e Gestão de Chamados:** Fluxo completo para usuários abrirem tickets, com atribuição a técnicos, prazos estipulados (due date), avaliação de atendimento com comentários e um histórico unificado (timeline) ordenado. Prioridades e prazos são definidos exclusivamente pela equipe técnica.
- **Base de Conhecimento e Respostas Rápidas:** Sistema de artigos com suporte a pesquisa, anexos de mídia (imagens e arquivos), formatação markdown e controle de acesso hierárquico. Categorias, templates e artigos possuem exclusão lógica (soft delete / arquivamento).
- **Anexos e Comunicação:** Envio de imagens e documentos via chamados e respostas (integração Multer/upload local). Possui geração rápida de salas de conferência (Jitsi Meet) integradas na timeline para suporte remoto imediato.
- **Agenda Google:** Integração com gerador de links para criação rápida de eventos no Google Agenda com fusos horários ajustados automaticamente.
- **Perfil de Usuário:** Gestão autônoma de perfil, onde o usuário pode alterar sua foto (avatar), nome, e-mail e senha de forma simplificada e independente, com limpeza automática da foto de perfil antiga do servidor ao atualizar.
- **Controle de Permissões Rigoroso:** Três níveis de acesso (Admin, Técnico e Usuário). O Técnico pode criar apenas Usuários (não técnicos) e redefinir suas senhas. Ações irreversíveis (exclusão permanente de tickets, expurgo em massa "Purga") exigem autenticação dupla e estão restritas ao nível Administrador.

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

- **Backend (API):** `3772`
- **Frontend (SPA + Proxy Reverso Nginx):** `3773`

## Deploy via Portainer (Produção)

1. No Portainer, vá em **Stacks > Add stack**.
2. Escolha **Repository**.
3. Insira a URL do repositório GitHub (`https://github.com/AnthonyPerotti/suporte-ti-cte`).
4. Em **Environment variables**, se desejar, configure as variáveis para produção:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `POSTGRES_PASSWORD`
   - Configurações SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)

5. **Acesso:**
   Acesse a aplicação pela porta `3773` (`http://IP_DO_SERVIDOR:3773`). O container do frontend cuida automaticamente do roteamento para a API via proxy reverso interno.

## Credenciais Iniciais (Seed)
Ao rodar a stack pela primeira vez, o banco será populado com:
- **Admin:** `admin@cead.ufsm.br` / `Admin@123`
- **Técnico:** `tecnico@cead.ufsm.br` / `Temp@123` (exige troca no 1º login)
- **Usuário:** `usuario@cead.ufsm.br` / `Temp@123` (exige troca no 1º login)
