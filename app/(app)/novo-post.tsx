import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import {
  criarEnquete,
  criarPost,
  escolherImagem,
  fazerUploadImagemPost,
} from '@/features/feed/api';
import { ICONE_TIPO_POST, ROTULO_TIPO_POST, type TipoPost } from '@/features/feed/types';

const TIPOS: TipoPost[] = ['texto', 'foto', 'evento', 'lembrete', 'enquete'];
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_OPCOES_ENQUETE = 4;
const MIN_OPCOES_ENQUETE = 2;

export default function NovoPost() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [tipo, setTipo] = useState<TipoPost>('texto');
  const [conteudo, setConteudo] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  const [opcoesEnquete, setOpcoesEnquete] = useState<string[]>(['', '']);
  const [erro, setErro] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile?.turma_id) throw new Error('Sem turma associada.');

      if (tipo === 'enquete') {
        await criarEnquete({
          autorId: profile.id,
          turmaId: profile.turma_id,
          pergunta: conteudo.trim(),
          opcoes: opcoesEnquete.map((o) => o.trim()).filter(Boolean),
        });
        return;
      }

      let midiaUrl: string | null = null;
      if (tipo === 'foto' && imagemUri) {
        midiaUrl = await fazerUploadImagemPost(profile.turma_id, imagemUri);
      }

      await criarPost({
        autorId: profile.id,
        turmaId: profile.turma_id,
        tipo,
        conteudo: conteudo.trim() || null,
        midiaUrl,
        dataEvento: tipo === 'evento' ? dataEvento.trim() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', profile?.turma_id] });
      router.back();
    },
    onError: (error) => setErro(mensagemDeErro(error)),
  });

  function handleAlterarOpcao(indice: number, texto: string) {
    setOpcoesEnquete((atual) => atual.map((o, i) => (i === indice ? texto : o)));
  }

  function handleAdicionarOpcao() {
    setOpcoesEnquete((atual) => (atual.length < MAX_OPCOES_ENQUETE ? [...atual, ''] : atual));
  }

  function handleRemoverOpcao(indice: number) {
    setOpcoesEnquete((atual) =>
      atual.length > MIN_OPCOES_ENQUETE ? atual.filter((_, i) => i !== indice) : atual,
    );
  }

  async function handleEscolherImagem() {
    try {
      setErro(null);
      const uri = await escolherImagem();
      if (uri) setImagemUri(uri);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  function handlePublicar() {
    if (tipo === 'foto' && !imagemUri) {
      setErro('Escolhe uma imagem antes de publicar.');
      return;
    }
    if (tipo === 'evento' && !REGEX_DATA.test(dataEvento.trim())) {
      setErro('Informe a data do evento no formato AAAA-MM-DD.');
      return;
    }
    if (tipo === 'enquete') {
      const opcoesPreenchidas = opcoesEnquete.map((o) => o.trim()).filter(Boolean);
      if (opcoesPreenchidas.length < MIN_OPCOES_ENQUETE) {
        setErro(`Preencha pelo menos ${MIN_OPCOES_ENQUETE} opções.`);
        return;
      }
    }
    if (tipo !== 'foto' && !conteudo.trim()) {
      setErro(
        tipo === 'enquete'
          ? 'Escreve a pergunta da enquete.'
          : 'Escreve alguma coisa antes de publicar.',
      );
      return;
    }
    setErro(null);
    mutation.mutate();
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
        <Text className="text-2xl font-bold text-primary dark:text-primary-dark">Novo post</Text>

        <View className="flex-row flex-wrap gap-2">
          {TIPOS.map((opcao) => (
            <Pressable
              key={opcao}
              onPress={() => setTipo(opcao)}
              accessibilityRole="button"
              accessibilityState={{ selected: tipo === opcao }}
              className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-md border px-4 ${
                tipo === opcao
                  ? 'border-primary bg-primary/10 dark:border-primary-dark'
                  : 'border-slate-700'
              }`}
            >
              <Ionicons
                name={ICONE_TIPO_POST[opcao]}
                size={15}
                color={tipo === opcao ? '#8B5CF6' : '#94A3B8'}
              />
              <Text className="text-sm text-slate-100">{ROTULO_TIPO_POST[opcao]}</Text>
            </Pressable>
          ))}
        </View>

        {tipo === 'evento' ? (
          <TextField
            label="Data do evento (AAAA-MM-DD)"
            icon="calendar-outline"
            value={dataEvento}
            onChangeText={setDataEvento}
            placeholder="2026-10-15"
            keyboardType="numbers-and-punctuation"
          />
        ) : null}

        <TextField
          label={
            tipo === 'foto'
              ? 'Legenda (opcional)'
              : tipo === 'enquete'
                ? 'Pergunta da enquete'
                : 'O que você quer contar pra turma?'
          }
          value={conteudo}
          onChangeText={setConteudo}
          multiline
          numberOfLines={tipo === 'enquete' ? 2 : 4}
          style={{ minHeight: tipo === 'enquete' ? 56 : 96, textAlignVertical: 'top' }}
        />

        {tipo === 'enquete' ? (
          <View className="gap-2">
            {opcoesEnquete.map((opcao, indice) => (
              <View key={indice} className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextField
                    label={`Opção ${indice + 1}`}
                    value={opcao}
                    onChangeText={(texto) => handleAlterarOpcao(indice, texto)}
                    placeholder={`ex.: ${indice === 0 ? 'Sexta-feira' : 'Segunda-feira'}`}
                  />
                </View>
                {opcoesEnquete.length > MIN_OPCOES_ENQUETE ? (
                  <Pressable
                    onPress={() => handleRemoverOpcao(indice)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover opção ${indice + 1}`}
                    className="min-h-11 min-w-11 items-center justify-center"
                  >
                    <Ionicons name="close-circle-outline" size={22} color="#94A3B8" />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {opcoesEnquete.length < MAX_OPCOES_ENQUETE ? (
              <Button
                label="Adicionar opção"
                icon="add-circle-outline"
                variant="secondary"
                onPress={handleAdicionarOpcao}
              />
            ) : null}
          </View>
        ) : null}

        {tipo === 'foto' ? (
          <View className="gap-2">
            {imagemUri ? (
              <Image
                source={{ uri: imagemUri }}
                className="h-48 w-full rounded-lg"
                resizeMode="cover"
              />
            ) : null}
            <Button
              label={imagemUri ? 'Trocar imagem' : 'Escolher imagem'}
              icon="image-outline"
              variant="secondary"
              onPress={handleEscolherImagem}
            />
          </View>
        ) : null}

        {erro ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color="#F87171" />
            <Text className="text-sm text-danger dark:text-danger-dark">{erro}</Text>
          </View>
        ) : null}

        <Button
          label="Publicar"
          icon="paper-plane"
          onPress={handlePublicar}
          loading={mutation.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
