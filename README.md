# Suporte TI CTE

Sistema completo de suporte técnico interno, gestão de chamados, auditoria de logs e base de conhecimento.

## Recursos Principais
- **Abertura e Gestão de Chamados:** Fluxo completo para usuários abrirem tickets, com atribuição a técnicos, prazos estipulados (due date), avaliação de atendimento com comentários e histórico unificado (timeline). Prioridades e prazos são definidos exclusivamente pela equipe técnica.
- **Regras de Encerramento e Reabertura:** Técnicos podem encerrar chamados. Uma vez encerrado, o chamado só pode ser reaberto por Administradores ou Root.
- **Notificações por E-mail e Threading:** E-mail de backup enviado ao solicitante na criação do chamado. Threading automático (mesmo assunto e cabeçalhos de referência) para agrupar todas as mensagens do chamado em uma única conversa no Gmail/Outlook.
- **Painel de Configuração de E-mail:** Interface administrativa para definir credenciais SMTP, testar conexão do servidor e testar o envio real de modelos de e-mail renderizados com dados fictícios.
- **Logs do Sistema e Auditoria:** Registro detalhado de todas as ações executadas no sistema (logins, alterações de status, criação de usuários, alterações de papel, exclusões, etc.) com IP, data/hora e detalhes em JSON. Suporte a busca por texto, filtros por recurso/ação/período e **exportação em CSV**.
- **Segurança e Níveis de Acesso (Root, Admin, Técnico e Usuário):**
  - **Root (`root@ufsm.br`):** Nível máximo do sistema. **Apenas a conta Root pode excluir chamados permanentemente**. O papel Root é protegido e não pode ser rebaixado nem alterado.
  - **Admin:** Pode gerenciar usuários, categorias, templates de e-mail, respostas rápidas, visualizar logs e arquivar/desarquivar chamados.
  - **Técnico:** Pode atender chamados, adicionar notas internas, atualizar status e criar usuários comuns.
  - **Proteção de Auto-Alteração:** Nenhum usuário pode alterar o seu próprio nível de acesso/cargo para evitar perda acidental de privilégios.

## Arquitetura
- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Frontend:** React, Vite
- **Deploy:** Docker, Docker Compose

## Pré-requisitos
- Docker e Docker Compose instalados.
- Gerenciador de Proxy Reverso ou redirecionamento direto de portas.

## Como rodar localmente (Desenvolvimento)

1. **Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Suba um banco Postgres localmente na porta 5432
   npx prisma db push
   node prisma/seed.js
   npm run dev
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   npm run dev
   ```

- **Backend (API):** `3772`
- **Frontend (SPA + Proxy Nginx):** `80` (configurável via variável de ambiente `FRONTEND_PORT`)

## Deploy via Portainer (Produção)

1. No Portainer, vá em **Stacks > Add stack**.
2. Escolha **Repository**.
3. Insira a URL do repositório GitHub (`https://github.com/AnthonyPerotti/suporte-ti-cte`).
4. Em **Actions**, clique em **Pull and redeploy**.

## Credenciais Iniciais (Seed)
Ao rodar a stack pela primeira vez, o banco é populado com as seguintes contas padrão:
- **Super Root:** `root@ufsm.br` / `Root@123`
- **Admin:** `admin@cead.ufsm.br` / `Admin@123`
- **Técnico:** `tecnico@cead.ufsm.br` / `Temp@123` (exige troca no 1º login)
- **Usuário:** `usuario@cead.ufsm.br` / `Temp@123` (exige troca no 1º login)
