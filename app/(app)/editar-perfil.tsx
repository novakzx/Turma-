import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { mensagemDeErro } from '@/features/auth/errors';
import { escolherImagem } from '@/features/feed/api';
import { FotoPerfil } from '@/features/perfil/FotoPerfil';
import { atualizarPerfil, fazerUploadFotoPerfil } from '@/features/perfil/api';

const REGEX_NOME_USUARIO = /^[a-z0-9_]{3,20}$/;

export default function EditarPerfil() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState(profile?.nome ?? '');
  const [nomeUsuario, setNomeUsuario] = useState(profile?.nome_usuario ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [fotoUriLocal, setFotoUriLocal] = useState<string | null>(null);
  const [erros, setErros] = useState<{ nome?: string; nomeUsuario?: string; geral?: string }>({});

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Sem perfil carregado.');

      const fotoUrl = fotoUriLocal
        ? await fazerUploadFotoPerfil(profile.id, fotoUriLocal)
        : undefined;

      await atualizarPerfil({
        id: profile.id,
        nome: nome.trim(),
        nomeUsuario: nomeUsuario.trim() || null,
        bio: bio.trim() || null,
        fotoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] });
      router.back();
    },
    onError: (error) => setErros({ geral: mensagemDeErro(error) }),
  });

  async function handleEscolherFoto() {
    try {
      const uri = await escolherImagem();
      if (uri) setFotoUriLocal(uri);
    } catch (error) {
      setErros((atual) => ({ ...atual, geral: mensagemDeErro(error) }));
    }
  }

  function handleSalvar() {
    const novosErros: typeof erros = {};
    if (!nome.trim()) novosErros.nome = 'Informe seu nome.';
    const usuarioLimpo = nomeUsuario.trim().replace(/^@/, '').toLowerCase();
    if (usuarioLimpo && !REGEX_NOME_USUARIO.test(usuarioLimpo)) {
      novosErros.nomeUsuario = 'Só letras minúsculas, número e "_", de 3 a 20 caracteres.';
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setNomeUsuario(usuarioLimpo);
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
        <Text className="text-2xl font-bold text-primary dark:text-primary-dark">
          Editar perfil
        </Text>

        <View className="items-center gap-3">
          <FotoPerfil
            caminho={profile?.foto_url ?? null}
            previewUri={fotoUriLocal}
            nome={nome}
            tamanho={112}
          />
          <Button
            label={fotoUriLocal || profile?.foto_url ? 'Trocar foto' : 'Escolher foto'}
            icon="camera-outline"
            variant="secondary"
            onPress={handleEscolherFoto}
          />
        </View>

        <TextField
          label="Nome"
          icon="person-outline"
          value={nome}
          onChangeText={setNome}
          error={erros.nome}
        />

        <TextField
          label="Nome de usuário (opcional)"
          icon="at-outline"
          value={nomeUsuario}
          onChangeText={setNomeUsuario}
          error={erros.nomeUsuario}
          placeholder="ex.: mariateste"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View className="gap-1.5">
          <TextField
            label="Bio (opcional)"
            icon="chatbox-ellipses-outline"
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, 280))}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            placeholder="Conta um pouco sobre você..."
          />
          <Text className="self-end text-xs text-slate-400 dark:text-slate-500">
            {bio.length}/280
          </Text>
        </View>

        {erros.geral ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{erros.geral}</Text>
        ) : null}

        <Button
          label="Salvar"
          icon="checkmark"
          onPress={handleSalvar}
          loading={mutation.isPending}
        />

        <Button
          label="Trocar de turma"
          icon="school-outline"
          variant="secondary"
          onPress={() => router.push('/trocar-turma')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
