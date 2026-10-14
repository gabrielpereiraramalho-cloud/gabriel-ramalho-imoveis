# Deploy na Vercel — checklist

> Documento de preparação. O deploy em si e o domínio serão feitos depois.

## Passos

1. **Criar/importar o projeto na Vercel** (New Project → Import).
2. **Conectar o repositório Git** (GitHub/GitLab/Bitbucket) com este projeto.
3. **Configurar as variáveis de ambiente** no painel da Vercel (Project → Settings → Environment Variables). Ver lista abaixo. Não colar valores em arquivos versionados.
4. **Fazer o deploy** (build automático do Next.js — sem configuração extra).
5. **Atualizar `NEXT_PUBLIC_SITE_URL`** para o domínio canônico de produção: `https://www.ramalhonexo.com.br`.
6. **Redeploy** para aplicar a nova `NEXT_PUBLIC_SITE_URL` (variáveis `NEXT_PUBLIC_*` são embutidas no build).
7. **Testar Supabase/Auth**: login em `/admin/login`, RLS e leitura pública.
8. **Testar links públicos**: `/`, `/imoveis`, `/imovel/[slug]`, `/sitemap.xml`, `/robots.txt`.
9. **Testar Open Graph**: compartilhar um link de imóvel (WhatsApp/Facebook) e validar título, descrição e imagem de capa.
10. **Configurar o domínio** (Project → Settings → Domains). Domínio canônico: `www.ramalhonexo.com.br`. Os domínios antigos (`gabrielramalhoimoveis.com.br` e `www.`) e o ápice `ramalhonexo.com.br` devem redirecionar via `308` para `https://www.ramalhonexo.com.br`, preservando o path.

## Migração de domínio (gabrielramalhoimoveis.com.br → www.ramalhonexo.com.br)

Como todo o site deriva de `NEXT_PUBLIC_SITE_URL` (metadata, canonical, Open Graph,
sitemap, robots, JSON-LD e mensagens de compartilhamento), a migração de domínio é:

1. Ajustar `NEXT_PUBLIC_SITE_URL=https://www.ramalhonexo.com.br` na Vercel e **redeploy**.
2. Atualizar a URL do **webhook da Órulo** no painel da Órulo para o domínio novo
   (`https://www.ramalhonexo.com.br/api/orulo/webhook?token=<ORULO_WEBHOOK_SECRET>`) —
   um `308` em requisição POST não é confiável.
3. Rodar o backfill dos `publication_links` da Órulo (empreendimentos já publicados
   apontam para o domínio antigo): `node scripts/migrate-publication-links.mjs`
   (sem argumentos = **dry-run**; `--execute` aplica). O script só reescreve
   `publication_links` — não altera `published`, `in_distribution` nem `removed_at`.
4. Search Console: adicionar a propriedade do domínio novo e reenviar o sitemap.

## Variáveis de ambiente públicas

Configurar na Vercel (valores reais NÃO vão neste documento):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_CRECI`
- `NEXT_PUBLIC_SITE_URL`

## Observações de segurança

- Nunca versionar `.env.local` (já está no `.gitignore`).
- Nunca expor a chave secreta/`service_role` do Supabase no frontend (não usar `NEXT_PUBLIC_` para segredos).
- Chaves secretas de servidor, se necessárias, devem ser adicionadas apenas no painel da Vercel (sem prefixo `NEXT_PUBLIC_`).
