-- Advisor de segurança do Supabase acusou `search_path` mutável nas
-- duas funções novas da migration `reforco_filtro_palavroes`
-- (`function_search_path_mutable`) -- toda função nova neste projeto
-- fixa o search_path (ver padrão já usado em `censurar_texto` e nas
-- funções de private/CLAUDE.md), essas duas passaram batido. Sem
-- SECURITY DEFINER aqui, o risco prático é baixo, mas fixar custa
-- nada e mantém o padrão do projeto consistente.
alter function private.classe_leet(text) set search_path = '';
alter function private.padrao_ofuscado(text) set search_path = '';
