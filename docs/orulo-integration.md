# Integração Órulo — estado e plano

## Estado atual (Fase de teste)

- **Auth (oruloClientAuth)**: `POST /oauth/token` (`application/x-www-form-urlencoded`, `grant_type=client_credentials`, `client_id`/`client_secret` no **body**). Token reaproveitado em memória. `/oauth/*` não usa `/api/v2/`.
- **Catálogo**: rotas sob `/api/v2/`.
  - `GET /api/v2/config` — confirma integração ativa antes de sincronizar.
  - `GET /api/v2/buildings/ids/active?page=&results_per_page=` — paginado (máx. 500/pág.); percorrer todas as `total_pages`.
  - `GET /api/v2/buildings/{id}` — detalhe do empreendimento.
  - `GET /api/v2/buildings/{id}/images` e `/floor_plans` — usados na 1ª sincronização.
- **Armazenamento**: tabelas **separadas** `orulo_buildings` (PK = `external_id` imutável, com `raw jsonb`, `images`, `floor_plans`) e `orulo_sync_runs` (log). RLS **admin-only**. Não misturado com `properties` (imóveis manuais intactos). Dados **não** publicados no catálogo público.
- **Admin**: `/admin/orulo` (protegida) com status, contadores, lista e "Sincronizar agora" (upsert idempotente por `external_id`, sem exclusão).
- **Segurança**: secret só server-side (`ORULO_CLIENT_SECRET`, sem `NEXT_PUBLIC`), fora do Git, nunca em logs; cliente HTTP marcado `server-only`.

## Pendências / a confirmar contra a praça de teste real

- Host base da API (default `https://www.orulo.com.br`, ajustável via `ORULO_BASE_URL`).
- Chave do array de IDs em `/ids/active` (`building_ids` | `ids` | `results`) e nomes reais dos campos do building (nome/incorporadora/cidade/bairro/preço/quartos…). Hoje extraídos **defensivamente**; `raw` preserva tudo.
- Formato de `GET /api/v2/config` (chave de "ativo").
- Fase 6 (card por empreendimento vs. por tipologia) — decidir após ver os dados reais.

## Próxima fase — Webhook (NÃO implementado ainda)

- **Endpoint sugerido**: `POST /api/orulo/webhook` (route handler server-side).
- **Autenticidade**: validar assinatura/segredo compartilhado da Órulo (a confirmar na doc) antes de processar; rejeitar sem credencial.
- **Eventos** e tratamento (idempotente):
  - `active` / `added_to_distribution` → reprocessar `GET /api/v2/buildings/{id}` (criar/atualizar).
  - `removed` → **soft delete** / despublicar (não apagar histórico).
  - `excluded_from_distribution` → remover no escopo da nossa integração (hard delete previsto pela doc).
- **Consolidação**: eventos muito próximos podem ser agrupados em janela < ~5 min; processar de forma idempotente.
- **Imagens/plantas em `active`**: comparar IDs de `images`/`floor_plans` do detalhe com os guardados; só rebuscar `/images` e `/floor_plans` se houver ID novo/removido.

## Próxima fase — Reconciliação periódica (sem cron ainda)

1. `GET /api/v2/buildings/ids/active` (todas as páginas).
2. `GET /api/v2/buildings/ids/removed?updated_after=` (intervalo ≤ 90 dias).
   Frequência: no máx. 1×/dia, no mín. 1×/semana. Arquitetura preparada; agendamento fica para depois.

## Próxima fase — Publication links (OBRIGATÓRIO ao publicar)

- Ao publicar um empreendimento no site: `PUT /api/v2/buildings/{id}/publication_links` (token da imobiliária; **não** aceita oruloEndUserAuth). Substitui a lista anterior; pode ter múltiplos links (inclusive por tipologia).
- **Não manter atualizado pode restringir o acesso à API / notificações** → incluir na etapa de publicação pública.

## Contratos reais confirmados (praça de homologação)

- **Auth:** `POST /oauth/token` (form-urlencoded, body) → `{ access_token, expires_in ~1 ano, token_type: Bearer }`.
- **Config:** `GET /api/v2/config` → `{ active: true, name, ... }`.
- **IDs ativos:** `GET /api/v2/buildings/ids/active?page=&results_per_page=` → `{ buildings: [{ id, updated_at }], total, total_pages }` (a chave é **`buildings`**).
- **Detalhe:** `GET /api/v2/buildings/{id}` → inclui `images` e `floor_plans` completos (os endpoints dedicados `/images` e `/floor_plans` retornam 400 — usar o detalhe). Bairro em `address.area`; incorporadora em `developer.name`; numéricos em `min_*`/`max_*`; datas `dd/MM/yyyy HH:mm:ss`.
- **URLs de mídia:** `https://static.orulo.com.br/images/properties/{segmento}/{id}.jpg` — segmentos `thumb`, `featured_modern_without_watermark`, `large`, `xlarge` (imagens e plantas).
- **publication_links:** `PUT /api/v2/buildings/{id}/publication_links` body `{ publication_links: [{ url, active: true }] }` → 200 (substitui a lista). Remover = lista vazia.

## Publicação automática na praça definitiva (PREPARADA, não ativada)

Hoje a publicação é **individual** pelo admin. Para a praça definitiva de PB, a arquitetura já está pronta para publicar toda a carteira válida automaticamente:

- **Gate de validação** (`checkEligibility`, já reutilizável): nome, cidade, bairro, preço válido (>0), ≥1 imagem, status presente, origem Órulo (garantida pela tabela).
- **Ativação por env flag** (a criar): `ORULO_AUTO_PUBLISH` (default off) — mantém os 40 de SP despublicados; quando a PB for liberada, ligar a flag e a sincronização/webhook publica os elegíveis.
- **Webhook** (fase seguinte): `active`/`added_to_distribution` → reprocessa detalhe + (se auto on) publica elegíveis; `removed`/`excluded_from_distribution` → despublica + limpa publication_links. Idempotente por `external_id` (sem duplicidade).
- **publication_links** enviado/atualizado a cada publish/unpublish (já implementado nas ações individuais; reaproveitar no fluxo automático).

## oruloEndUserAuth (não implementar agora)

Auth opcional de corretor para dados comerciais em tempo real (promoções, premiações, comissão, contatos comerciais, arquivos, oportunidades). **Não sincronizar/armazenar** esses dados; se necessário, consultar em tempo real via fluxo OAuth separado.
