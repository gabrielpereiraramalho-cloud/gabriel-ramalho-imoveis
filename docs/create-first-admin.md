# Criar o primeiro administrador

A tabela `public.profiles` possui RLS e não permite autocriação de admin.
Crie o primeiro acesso manualmente pelo painel do Supabase (sem expor a
secret/service key no frontend).

## Passos

1. **Criar o usuário no Supabase Auth**
   Painel do Supabase → **Authentication → Users → Add user**.
   Defina e-mail e senha do administrador.

2. **Copiar o UUID do usuário**
   Ainda em Authentication → Users, copie o `User UID` (UUID) do usuário criado.

3. **Inserir o profile via SQL**
   Supabase → **SQL Editor** → execute (substitua o UUID pelo real):

   ```sql
   insert into public.profiles (id, full_name, role, active)
   values (
     'UUID_DO_USUARIO',
     'Gabriel Ramalho',
     'admin',
     true
   );
   ```

Pronto: faça login em `/admin/login` com o e-mail e a senha definidos no passo 1.
