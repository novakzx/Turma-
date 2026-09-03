-- A aba "Avisos" foi substituída pelo calendário de feriados escolares
-- (pedido explícito do usuário) — não existe mais tela nenhuma no app
-- que mostre um `aviso`. Sem desligar isto, o cron continuaria rodando
-- a cada 4h, inserindo avisos tipo='trajeto' que ninguém consegue ver
-- e disparando push notification (via o trigger de `notificar-aviso`)
-- pra uma tela que não existe mais — puro trabalho desperdiçado e
-- notificação sem destino. A tabela `avisos`, a RLS e o trigger de push
-- continuam existindo (não foi apagado nada do schema), só a automação
-- periódica que gerava avisos sozinha foi desligada.
select cron.unschedule('aviso-clima-periodico');
