-- Endurecimento (pedido explícito do usuário: "nivel empresa
-- internacional"). Os três buckets de mídia (`perfil-fotos`,
-- `posts-midia`, `stories-midia`) foram criados sem
-- `file_size_limit` nem `allowed_mime_types` -- qualquer usuário
-- autenticado podia enviar um arquivo de qualquer tipo e tamanho
-- (o app só filtra pelo seletor de mídia do cliente, que não é uma
-- barreira de verdade contra alguém batendo direto na API de
-- storage). Restringe pelo tipo de mídia que cada bucket realmente
-- usa (posts/perfil são só foto; stories aceita foto ou vídeo curto,
-- ver `escolherFotoOuVideo` em src/features/feed/api.ts) e por um
-- limite de tamanho generoso o bastante pra uso normal, mas que barra
-- upload de arquivo gigante.
-- 'image/jpg' (não é o MIME padrão de verdade, é 'image/jpeg') entra
-- na lista também: alguns navegadores/WebViews devolvem esse valor
-- não-padrão pra foto tirada na hora — descoberto testando o upload
-- de verdade depois de aplicar a restrição.
update storage.buckets
set file_size_limit = 8 * 1024 * 1024, -- 8 MB
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
where id = 'perfil-fotos';

update storage.buckets
set file_size_limit = 10 * 1024 * 1024, -- 10 MB
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
where id = 'posts-midia';

update storage.buckets
set file_size_limit = 60 * 1024 * 1024, -- 60 MB (vídeo de story até 60s)
    allowed_mime_types = array[
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic',
      'video/mp4', 'video/quicktime', 'video/webm'
    ]
where id = 'stories-midia';
