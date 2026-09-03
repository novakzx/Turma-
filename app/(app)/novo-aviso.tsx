import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { criarAviso } from '@/features/avisos/api';
import {
  ICONE_TIPO_AVISO,
  ROTULO_TIPO_AVISO,
  TIPOS_AVISO_MANUAL,
  type TipoAviso,
} from '@/features/avisos/types';
import { mensagemDeErro } from '@/features/auth/errors';

type Escopo = 'escola' | 'turma';

/**
 * Só professor/coordenacao chega aqui de verdade — a RLS de INSERT em
 * avisos já bloqueia aluno no banco (ver migration inicial), essa tela é
 * só a UI correspondente. O botão "+" que leva aqui (app/(app)/index.tsx)
 * também só aparece pro papel certo.
 */
export default function NovoAviso() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [tipo, setTipo] = useState<TipoAviso>('comunicado');
  const [escopo, setEscopo] = useState<Escopo>('turma');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erros, setErros] = useState<{ titulo?: string; geral?: string }>({});

  const mutation = useMutation({
    mutationFn: criarAviso,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos'] });
      router.back();
    },
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  function handlePublicar() {
    if (!profile?.escola_id) return;
    if (!titulo.trim()) {
      setErros({ titulo: 'Informe um título.' });
      return;
    }
    setErros({});

    mutation.mutate({
      autorId: profile.id,
      escolaId: profile.escola_id,
      turmaId: escopo === 'turma' ? profile.turma_id : null,
      tipo,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      dataEvento: null,
    });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="gap-4 px-6 pb-10 pt-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-bold text-primary dark:text-primary-dark">Novo aviso</Text>

        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</Text>
          <View className="flex-row flex-wrap gap-2">
            {TIPOS_AVISO_MANUAL.map((opcao) => (
              <Pressable
                key={opcao}
                onPress={() => setTipo(opcao)}
                accessibilityRole="button"
                accessibilityState={{ selected: tipo === opcao }}
                className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-full border px-4 ${
                  tipo === opcao
                    ? 'border-primary bg-primary/10 dark:border-primary-dark'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Ionicons
                  name={ICONE_TIPO_AVISO[opcao]}
                  size={15}
                  color={tipo === opcao ? '#4F46E5' : '#94A3B8'}
                />
                <Text className="text-sm text-slate-900 dark:text-slate-100">
                  {ROTULO_TIPO_AVISO[opcao]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Quem recebe
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setEscopo('turma')}
              accessibilityRole="button"
              accessibilityState={{ selected: escopo === 'turma' }}
              className={`min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border ${
                escopo === 'turma'
                  ? 'border-primary bg-primary/10 dark:border-primary-dark'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={escopo === 'turma' ? '#4F46E5' : '#94A3B8'}
              />
              <Text className="text-slate-900 dark:text-slate-100">Só minha turma</Text>
            </Pressable>
            <Pressable
              onPress={() => setEscopo('escola')}
              accessibilityRole="button"
              accessibilityState={{ selected: escopo === 'escola' }}
              className={`min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border ${
                escopo === 'escola'
                  ? 'border-primary bg-primary/10 dark:border-primary-dark'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <Ionicons
                name="school-outline"
                size={16}
                color={escopo === 'escola' ? '#4F46E5' : '#94A3B8'}
              />
              <Text className="text-slate-900 dark:text-slate-100">Escola toda</Text>
            </Pressable>
          </View>
        </View>

        <TextField
          label="Título"
          icon="text-outline"
          value={titulo}
          onChangeText={setTitulo}
          error={erros.titulo}
        />
        <TextField
          label="Descrição (opcional)"
          value={descricao}
          onChangeText={setDescricao}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />

        {erros.geral ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color="#DC2626" />
            <Text className="text-sm text-danger dark:text-danger-dark">{erros.geral}</Text>
          </View>
        ) : null}

        <Button
          label="Publicar"
          icon="megaphone"
          onPress={handlePublicar}
          loading={mutation.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
