import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { EntradaAnimada } from '@/components/ui/EntradaAnimada';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { assinarSalas, criarSalaAssunto, listarSalas } from '@/features/chat/api';
import {
  ICONE_TIPO_SALA,
  ROTULO_TIPO_SALA,
  type Sala,
  type TipoSalaChat,
} from '@/features/chat/types';
import { listarMinhasConversas, listarPedidosDeMensagem } from '@/features/mensagens/api';
import type { ConversaComResumo } from '@/features/mensagens/api';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { supabase } from '@/lib/supabase';

function LinhaSala({ sala, index }: { sala: Sala; index: number }) {
  return (
    <EntradaAnimada index={index}>
      <Pressable
        onPress={() => router.push(`/sala/${sala.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Abrir sala ${sala.nome}`}
        className="min-h-11 flex-row items-center gap-3 rounded-3xl border border-slate-100 bg-surface p-3 shadow-sm shadow-slate-900/5 active:opacity-80 dark:border-slate-800 dark:bg-surface-dark"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
          <Ionicons name={ICONE_TIPO_SALA[sala.tipo]} size={20} color="#4F46E5" />
        </View>
        <Text className="flex-1 text-base font-medium text-slate-900 dark:text-slate-100">
          {sala.nome}
        </Text>
        {sala.trancada ? <Ionicons name="lock-closed" size={16} color="#94A3B8" /> : null}
        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
      </Pressable>
    </EntradaAnimada>
  );
}

function Secao({ titulo, salas, offset }: { titulo: string; salas: Sala[]; offset: number }) {
  if (salas.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{titulo}</Text>
      <View className="gap-2">
        {salas.map((sala, i) => (
          <LinhaSala key={sala.id} sala={sala} index={offset + i} />
        ))}
      </View>
    </View>
  );
}

function BotaoAba({
  label,
  ativo,
  onPress,
}: {
  label: string;
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      className={`min-h-11 flex-1 items-center justify-center rounded-full px-4 py-2 ${
        ativo ? 'bg-primary dark:bg-primary-dark' : 'bg-transparent'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${ativo ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Instagram mostra a hora da última mensagem na lista de conversas, não
 * um chevron — mesma ideia de "hoje = só a hora, senão a data curta" do
 * divisor de horário dentro da conversa (conversa/[id].tsx). */
function formatarHoraLista(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  if (data.toDateString() === hoje.toDateString()) {
    return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(data);
  }
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' }).format(data);
}

function LinhaConversa({ conversa, index }: { conversa: ConversaComResumo; index: number }) {
  const nome =
    conversa.tipo === 'grupo'
      ? (conversa.nome ?? 'Grupo')
      : (conversa.outroParticipante?.nome ?? 'Alguém');
  const foto = conversa.tipo === 'grupo' ? null : (conversa.outroParticipante?.foto_url ?? null);

  return (
    <EntradaAnimada index={index}>
      <Pressable
        onPress={() => router.push(`/conversa/${conversa.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Abrir conversa com ${nome}`}
        className="min-h-11 flex-row items-center gap-3 px-1 py-2.5 active:opacity-70"
      >
        {conversa.tipo === 'grupo' ? (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
            <Ionicons name="people" size={26} color="#F59E0B" />
          </View>
        ) : (
          <FotoPerfil caminho={foto} nome={nome} tamanho={56} />
        )}
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">{nome}</Text>
          {conversa.ultimaMensagem ? (
            <Text numberOfLines={1} className="text-sm text-slate-500 dark:text-slate-400">
              {conversa.ultimaMensagem.conteudo}
            </Text>
          ) : (
            <Text className="text-sm text-slate-400 dark:text-slate-500">Sem mensagens ainda</Text>
          )}
        </View>
        {conversa.ultimaMensagem ? (
          <Text className="text-xs text-slate-400 dark:text-slate-500">
            {formatarHoraLista(conversa.ultimaMensagem.criado_em)}
          </Text>
        ) : null}
      </Pressable>
    </EntradaAnimada>
  );
}

function AbaMensagens() {
  const { profile } = useAuth();
  const [subaba, setSubaba] = useState<'conversas' | 'pedidos'>('conversas');

  const conversasQuery = useQuery({
    queryKey: ['minhas-conversas', profile?.id],
    queryFn: () => listarMinhasConversas(profile!.id),
    enabled: !!profile,
  });

  const pedidosQuery = useQuery({
    queryKey: ['pedidos-mensagem', profile?.id],
    queryFn: () => listarPedidosDeMensagem(profile!.id),
    enabled: !!profile,
  });

  const lista = subaba === 'conversas' ? conversasQuery.data : pedidosQuery.data;
  const carregando = subaba === 'conversas' ? conversasQuery.isLoading : pedidosQuery.isLoading;

  return (
    <View className="gap-4">
      <View className="flex-row gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
        <BotaoAba
          label="Conversas"
          ativo={subaba === 'conversas'}
          onPress={() => setSubaba('conversas')}
        />
        <BotaoAba
          label={`Pedidos${pedidosQuery.data?.length ? ` (${pedidosQuery.data.length})` : ''}`}
          ativo={subaba === 'pedidos'}
          onPress={() => setSubaba('pedidos')}
        />
      </View>

      <Button
        label="Nova conversa"
        icon="chatbubble-ellipses-outline"
        variant="secondary"
        onPress={() => router.push('/nova-conversa')}
      />

      {carregando ? (
        <LoadingState />
      ) : (lista ?? []).length === 0 ? (
        <EmptyState
          icon="chatbubble-outline"
          titulo={subaba === 'conversas' ? 'Nenhuma conversa ainda' : 'Nenhum pedido de mensagem'}
          descricao={
            subaba === 'pedidos'
              ? 'Mensagens de quem ainda não te segue aparecem aqui primeiro.'
              : undefined
          }
        />
      ) : (
        <View className="gap-2">
          {(lista ?? []).map((c, i) => (
            <LinhaConversa key={c.id} conversa={c} index={i} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function Chat() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [secao, setSecao] = useState<'salas' | 'mensagens'>('salas');
  const [criandoAssunto, setCriandoAssunto] = useState(false);
  const [nomeAssunto, setNomeAssunto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const salasQuery = useQuery({ queryKey: ['salas'], queryFn: listarSalas });

  useEffect(() => {
    if (!profile?.escola_id) return;
    const canal = assinarSalas(profile.escola_id, () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
    });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [profile?.escola_id, queryClient]);

  const porTipo = useMemo(() => {
    const grupos: Record<TipoSalaChat, Sala[]> = { turma: [], materia: [], assunto: [] };
    for (const sala of salasQuery.data ?? []) grupos[sala.tipo].push(sala);
    return grupos;
  }, [salasQuery.data]);

  const criarMutation = useMutation({
    mutationFn: () =>
      criarSalaAssunto({
        escolaId: profile!.escola_id as string,
        criadoPor: profile!.id,
        nome: nomeAssunto.trim(),
      }),
    onSuccess: () => {
      setNomeAssunto('');
      setCriandoAssunto(false);
      queryClient.invalidateQueries({ queryKey: ['salas'] });
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleCriarAssunto() {
    if (!nomeAssunto.trim()) {
      setErro('Dá um nome pro assunto.');
      return;
    }
    setErro(null);
    criarMutation.mutate();
  }

  const semSalas =
    porTipo.turma.length === 0 && porTipo.materia.length === 0 && porTipo.assunto.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-5 p-4 pb-28"
    >
      <View className="flex-row gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
        <BotaoAba label="Salas" ativo={secao === 'salas'} onPress={() => setSecao('salas')} />
        <BotaoAba
          label="Mensagens"
          ativo={secao === 'mensagens'}
          onPress={() => setSecao('mensagens')}
        />
      </View>

      {secao === 'mensagens' ? (
        <AbaMensagens />
      ) : salasQuery.isLoading ? (
        <LoadingState />
      ) : salasQuery.isError ? (
        <EmptyState
          titulo="Não deu pra carregar as salas"
          onTentarNovo={() => salasQuery.refetch()}
        />
      ) : (
        <>
          <Secao titulo={ROTULO_TIPO_SALA.turma} salas={porTipo.turma} offset={0} />
          <Secao
            titulo={`${ROTULO_TIPO_SALA.materia}s`}
            salas={porTipo.materia}
            offset={porTipo.turma.length}
          />
          <Secao
            titulo={ROTULO_TIPO_SALA.assunto}
            salas={porTipo.assunto}
            offset={porTipo.turma.length + porTipo.materia.length}
          />

          {semSalas ? (
            <EmptyState
              icon="chatbubbles-outline"
              titulo="Nenhuma sala por aqui ainda"
              descricao="A sala da tua turma aparece assim que a turma tiver matérias cadastradas."
            />
          ) : null}

          <View className="gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            {criandoAssunto ? (
              <View className="gap-2 rounded-3xl border border-slate-100 bg-surface p-3 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-surface-dark">
                <TextField
                  label="Nome do assunto (ex.: Dúvidas de matemática)"
                  icon="bulb-outline"
                  value={nomeAssunto}
                  onChangeText={setNomeAssunto}
                  error={erro ?? undefined}
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Cancelar"
                      variant="secondary"
                      onPress={() => {
                        setCriandoAssunto(false);
                        setErro(null);
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Criar sala"
                      icon="checkmark"
                      onPress={handleCriarAssunto}
                      loading={criarMutation.isPending}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <Button
                label="Nova sala de assunto"
                icon="add-circle-outline"
                variant="secondary"
                onPress={() => setCriandoAssunto(true)}
              />
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
