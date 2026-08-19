# Deploy na Vercel — checklist

> Documento de preparação. O deploy em si e o domínio serão feitos depois.

## Passos

1. **Criar/importar o projeto na Vercel** (New Project → Import).
2. **Conectar o repositório Git** (GitHub/GitLab/Bitbucket) com este projeto.
3. **Configurar as variáveis de ambiente** no painel da Vercel (Project → Settings → Environment Variables). Ver lista abaixo. Não colar valores em arquivos versionados.
4. **Fazer o deploy** (build automático do Next.js — sem configuração extra).
5. **Atualizar `NEXT_PUBLIC_SITE_URL`** para a URL de produção fornecida pela Vercel.
6. **Redeploy** para aplicar a nova `NEXT_PUBLIC_SITE_URL` (variáveis `NEXT_PUBLIC_*` são embutidas no build).
7. **Testar Supabase/Auth**: login em `/admin/login`, RLS e leitura pública.
8. **Testar links públicos**: `/`, `/imoveis`, `/imovel/[slug]`, `/sitemap.xml`, `/robots.txt`.
9. **Testar Open Graph**: compartilhar um link de imóvel (WhatsApp/Facebook) e validar título, descrição e imagem de capa.
10. **Configurar o domínio** posteriormente (Project → Settings → Domains) e reajustar `NEXT_PUBLIC_SITE_URL`.

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
