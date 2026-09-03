-- Login social (Google/Apple): o Supabase Auth cria a conta sozinho no
-- primeiro login, sem passar pelo formulário de cadastro — então não
-- existe nome de usuário, idade, aceite dos Termos de Uso nem o
-- consentimento dos pais/responsáveis nesse momento (Google não dá
-- nenhum desses dados). `fetchOrCreateProfile` cria a linha em
-- `profiles` mesmo assim (com esses campos vazios/default), e o app
-- redireciona pra uma tela nova (`(completar-cadastro)`) até eles serem
-- preenchidos.
--
-- Essas colunas até agora só eram gravadas uma vez, no INSERT do
-- cadastro normal — nunca precisaram de GRANT de UPDATE (o padrão deste
-- projeto: INSERT já vem liberado por padrão do Supabase pra
-- `authenticated`, só UPDATE exige grant explícito por coluna). Preencher
-- depois do login social é a primeira vez que esses campos precisam ser
-- atualizados numa linha que já existe.
grant update (idade, consentimento_responsavel, termos_aceitos_em)
  on public.profiles to authenticated;
