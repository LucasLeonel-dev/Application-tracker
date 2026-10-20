# Rastreador de Candidaturas — Contexto do Projeto

Aplicação para controlar candidaturas a estágios/vagas: cadastro de empresas e
vagas, status (aplicado, entrevista, oferta, rejeitado), datas e anotações.
Cada usuário só enxerga suas próprias candidaturas.

## Quem está desenvolvendo

Estudante de Engenharia de Software (4º período). Conhecimentos sólidos em JS,
HTML, CSS, Dart; noções de C (vetores, algoritmos) e passagem breve por Python
e SQL. Fastify, Prisma, PostgreSQL e JWT são tecnologias novas, aprendidas
durante este projeto — não assumir familiaridade prévia com elas.

**Modo de trabalho preferido: planejamento primeiro.** Priorize explicações,
direcionamento e esclarecimento de conceitos em vez de escrever código
diretamente. Só escreva ou edite código quando for explicitamente pedido.
Respostas devem ser concisas e práticas, sem explicações longas desnecessárias.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Fastify (TypeScript, `tsx`, **ESM**: `"type": "module"`, `module: nodenext`; imports locais com `.js`) |
| Banco de dados | PostgreSQL |
| ORM | Prisma 7 (`prisma-client` gerado em `src/generated/prisma`, adapter `@prisma/adapter-pg`) |
| Autenticação | JWT (`@fastify/jwt`) |
| Hash de senha | bcrypt |
| Docs da API | `@fastify/swagger` + `@fastify/swagger-ui` (em `/docs`) |
| Validação | Zod (`.parse` no handler; `ZodError` vira 400 no error handler global) |

## Estrutura de pastas

```
rastreador-candidaturas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── prisma.config.ts
│   ├── src/
│   │   ├── app.ts            # buildApp(): registra plugins e rotas (sem listen; usado nos testes com app.inject)
│   │   ├── server.ts         # entrada: buildApp() + listen
│   │   ├── routes/           # SÓ rotas — o @fastify/autoload carrega todo arquivo daqui (1 arquivo = 1 rota)
│   │   │   ├── auth/         # register.ts, login.ts
│   │   │   ├── companies/    # list, getById, create, delete
│   │   │   └── applications/ # list, getById, create, update
│   │   ├── schemas/          # schemas Zod por recurso (auth, companies, applications) + common (idParamsSchema)
│   │   ├── plugins/          # jwt, authenticate (app.authenticate), swagger, errorHandler — todos com fastify-plugin
│   │   ├── lib/              # prisma.ts (client), env.ts (variáveis validadas)
│   │   ├── utils/            # normalizeCompanyName, prismaErrors (isUniqueViolation...)
│   │   ├── types/fastify.d.ts # tipagem de app.authenticate e request.user
│   │   └── generated/prisma/ # gerado pelo `prisma generate` (fora do Git)
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── pages/
    │   ├── context/
    │   └── App.jsx
    ├── .env
    └── package.json
```

## Modelo de dados (MVP)

- **users**: id, name, email (único), password_hash, created_at
- **companies**: id, user_id (FK), name, normalized_name, website?, created_at
  — único por `(user_id, normalized_name)` (nome sem espaços e em maiúsculas)
- **applications**: id, user_id (FK), company_id (FK), role_title, status
  (`applied` | `interview` | `offer` | `rejected` | `withdrawn`), applied_at,
  notes?, created_at, updated_at — único por `(user_id, company_id, role_title)`
- Violação de unique (Prisma `P2002`) → 409; FK em uso ao apagar (`P2003`) → 409.

## Convenções

- Nomear rotas e tabelas em inglês (`applications`, não `candidaturas`).
- Toda rota autenticada filtra por `user_id` do token — nunca confiar em `id`
  vindo do frontend sem checar o dono.
- Segredos (string de conexão, JWT secret) só em `.env`, nunca commitados.
- Commits pequenos e descritivos (ex.: `feat: add applications CRUD routes`).
- Validar todo input no backend, mesmo com validação no frontend.

## Status atual

Fases 0–2 concluídas (setup, schema + migration `init`, auth com registro/login).
Fase 3 (companies): `GET /companies`, `GET /companies/:id`, `POST /companies`,
`DELETE /companies/:id` feitos — falta `PUT /companies/:id`.
Fase 4 (applications) em andamento: `GET /applications` (filtro por status e
empresa), `GET /applications/:id`, `POST /applications`, `PATCH /applications/:id`
feitos — falta `DELETE /applications/:id`.
Swagger está registrado, mas as rotas ainda não têm `schema` (Fase 5).

Roadmap completo (fases 0–9) em `planejamento-projeto.md`, na raiz do projeto
— consultar sempre que uma fase for concluída ou surgir dúvida sobre o próximo
passo.
