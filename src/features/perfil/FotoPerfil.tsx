import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Text, View } from 'react-native';

import { obterUrlAssinadaFoto } from './api';

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

/**
 * Avatar circular. Bucket privado (mesmo racional de `ImagemPost` — foto
 * de menor de idade não pode ter link público adivinhável), então sempre
 * lê via URL assinada. Sem `caminho` (ninguém enviou foto ainda), cai nas
 * iniciais do nome sobre um círculo colorido — nunca fica em branco.
 *
 * `previewUri` é pra quando o usuário acabou de escolher uma foto local
 * (em `editar-perfil.tsx`, antes do upload) — é uma URI `file://`/`blob:`
 * de verdade, não um caminho de Storage, então não passa por
 * `obterUrlAssinadaFoto`; tem prioridade sobre `caminho`.
 */
export function FotoPerfil({
  caminho,
  previewUri,
  nome,
  tamanho = 96,
}: {
  caminho: string | null;
  previewUri?: string | null;
  nome: string;
  tamanho?: number;
}) {
  const buscarAssinada = !previewUri && !!caminho;
  const { data: url, isLoading } = useQuery({
    queryKey: ['url-assinada-foto-perfil', caminho],
    queryFn: () => obterUrlAssinadaFoto(caminho as string),
    enabled: buscarAssinada,
    staleTime: 50 * 60 * 1000,
  });

  const estilo = { height: tamanho, width: tamanho, borderRadius: tamanho / 2 };
  const uriFinal = previewUri ?? url;

  if (buscarAssinada && (isLoading || !url)) {
    return (
      <View style={estilo} className="items-center justify-center bg-slate-700">
        <ActivityIndicator color="#8B5CF6" />
      </View>
    );
  }

  if (uriFinal) {
    return (
      <Image
        source={{ uri: uriFinal }}
        style={estilo}
        resizeMode="cover"
        accessibilityLabel={`Foto de perfil de ${nome}`}
      />
    );
  }

  return (
    <View
      style={estilo}
      className="items-center justify-center bg-primary shadow-sm dark:bg-primary-dark"
    >
      <Text className="font-bold text-white" style={{ fontSize: tamanho * 0.36 }}>
        {iniciais(nome)}
      </Text>
    </View>
  );
}
