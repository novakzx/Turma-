-- Pedido do usuário: "cada aluno escolhe que tipo de aviso recebe" —
-- lista de tipos de aviso que o próprio aluno silenciou (não quer
-- push). Vazio (padrão) = recebe tudo, mesmo comportamento de hoje.
alter table public.profiles
  add column tipos_aviso_silenciados text[] not null default '{}'
  check (
    tipos_aviso_silenciados <@ array[
      'greve', 'feriado', 'suspensao', 'mudanca_horario',
      'prova', 'trabalho', 'comunicado', 'trajeto'
    ]::text[]
  );

-- Mesmo padrão de coluna auto-editável já usado no resto de `profiles`
-- (`bio`, `link`, etc.) — grant específico, não a tabela inteira.
grant update (tipos_aviso_silenciados) on public.profiles to authenticated;
