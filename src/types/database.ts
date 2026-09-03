export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      avaliacoes: {
        Row: {
          aluno_id: string;
          criado_em: string;
          data: string | null;
          id: string;
          materia_id: string;
          nome: string;
          nota: number | null;
          peso: number;
        };
        Insert: {
          aluno_id: string;
          criado_em?: string;
          data?: string | null;
          id?: string;
          materia_id: string;
          nome: string;
          nota?: number | null;
          peso: number;
        };
        Update: {
          aluno_id?: string;
          criado_em?: string;
          data?: string | null;
          id?: string;
          materia_id?: string;
          nome?: string;
          nota?: number | null;
          peso?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'avaliacoes_aluno_id_fkey';
            columns: ['aluno_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'avaliacoes_materia_id_fkey';
            columns: ['materia_id'];
            isOneToOne: false;
            referencedRelation: 'materias';
            referencedColumns: ['id'];
          },
        ];
      };
      avisos: {
        Row: {
          autor_id: string | null;
          criado_em: string;
          data_evento: string | null;
          descricao: string | null;
          escola_id: string;
          id: string;
          origem: Database['public']['Enums']['origem_aviso'];
          tipo: Database['public']['Enums']['tipo_aviso'];
          titulo: string;
          turma_id: string | null;
        };
        Insert: {
          autor_id?: string | null;
          criado_em?: string;
          data_evento?: string | null;
          descricao?: string | null;
          escola_id: string;
          id?: string;
          origem?: Database['public']['Enums']['origem_aviso'];
          tipo: Database['public']['Enums']['tipo_aviso'];
          titulo: string;
          turma_id?: string | null;
        };
        Update: {
          autor_id?: string | null;
          criado_em?: string;
          data_evento?: string | null;
          descricao?: string | null;
          escola_id?: string;
          id?: string;
          origem?: Database['public']['Enums']['origem_aviso'];
          tipo?: Database['public']['Enums']['tipo_aviso'];
          titulo?: string;
          turma_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'avisos_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'avisos_escola_id_fkey';
            columns: ['escola_id'];
            isOneToOne: false;
            referencedRelation: 'escolas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'avisos_turma_id_fkey';
            columns: ['turma_id'];
            isOneToOne: false;
            referencedRelation: 'turmas';
            referencedColumns: ['id'];
          },
        ];
      };
      bloqueios: {
        Row: {
          bloqueado_id: string;
          bloqueador_id: string;
          criado_em: string;
          id: string;
        };
        Insert: {
          bloqueado_id: string;
          bloqueador_id: string;
          criado_em?: string;
          id?: string;
        };
        Update: {
          bloqueado_id?: string;
          bloqueador_id?: string;
          criado_em?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bloqueios_bloqueado_id_fkey';
            columns: ['bloqueado_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bloqueios_bloqueador_id_fkey';
            columns: ['bloqueador_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_ia_mensagens: {
        Row: {
          aluno_id: string;
          conteudo: string;
          criado_em: string;
          id: string;
          materia_id: string;
          papel: Database['public']['Enums']['papel_mensagem_ia'];
        };
        Insert: {
          aluno_id: string;
          conteudo: string;
          criado_em?: string;
          id?: string;
          materia_id: string;
          papel: Database['public']['Enums']['papel_mensagem_ia'];
        };
        Update: {
          aluno_id?: string;
          conteudo?: string;
          criado_em?: string;
          id?: string;
          materia_id?: string;
          papel?: Database['public']['Enums']['papel_mensagem_ia'];
        };
        Relationships: [
          {
            foreignKeyName: 'chat_ia_mensagens_aluno_id_fkey';
            columns: ['aluno_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_ia_mensagens_materia_id_fkey';
            columns: ['materia_id'];
            isOneToOne: false;
            referencedRelation: 'materias';
            referencedColumns: ['id'];
          },
        ];
      };
      conversas: {
        Row: {
          criado_em: string;
          criado_por: string | null;
          id: string;
          nome: string | null;
          tipo: Database['public']['Enums']['tipo_conversa'];
        };
        Insert: {
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          nome?: string | null;
          tipo: Database['public']['Enums']['tipo_conversa'];
        };
        Update: {
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          nome?: string | null;
          tipo?: Database['public']['Enums']['tipo_conversa'];
        };
        Relationships: [
          {
            foreignKeyName: 'conversas_criado_por_fkey';
            columns: ['criado_por'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversas_participantes: {
        Row: {
          conversa_id: string;
          criado_em: string;
          papel: Database['public']['Enums']['papel_participante'];
          pedido_aceito: boolean;
          profile_id: string;
        };
        Insert: {
          conversa_id: string;
          criado_em?: string;
          papel?: Database['public']['Enums']['papel_participante'];
          pedido_aceito?: boolean;
          profile_id: string;
        };
        Update: {
          conversa_id?: string;
          criado_em?: string;
          papel?: Database['public']['Enums']['papel_participante'];
          pedido_aceito?: boolean;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversas_participantes_conversa_id_fkey';
            columns: ['conversa_id'];
            isOneToOne: false;
            referencedRelation: 'conversas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversas_participantes_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      denuncias: {
        Row: {
          conteudo_id: string;
          criado_em: string;
          denunciante_id: string | null;
          escola_id: string;
          id: string;
          motivo: string;
          status: Database['public']['Enums']['status_denuncia'];
          tipo_conteudo: Database['public']['Enums']['tipo_conteudo_denuncia'];
        };
        Insert: {
          conteudo_id: string;
          criado_em?: string;
          denunciante_id?: string | null;
          escola_id: string;
          id?: string;
          motivo: string;
          status?: Database['public']['Enums']['status_denuncia'];
          tipo_conteudo: Database['public']['Enums']['tipo_conteudo_denuncia'];
        };
        Update: {
          conteudo_id?: string;
          criado_em?: string;
          denunciante_id?: string | null;
          escola_id?: string;
          id?: string;
          motivo?: string;
          status?: Database['public']['Enums']['status_denuncia'];
          tipo_conteudo?: Database['public']['Enums']['tipo_conteudo_denuncia'];
        };
        Relationships: [
          {
            foreignKeyName: 'denuncias_denunciante_id_fkey';
            columns: ['denunciante_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'denuncias_escola_id_fkey';
            columns: ['escola_id'];
            isOneToOne: false;
            referencedRelation: 'escolas';
            referencedColumns: ['id'];
          },
        ];
      };
      escolas: {
        Row: {
          criado_em: string;
          dominio_email: string | null;
          endereco: string | null;
          id: string;
          latitude: number | null;
          limite_chuva_percentual: number;
          limite_temperatura_celsius: number;
          longitude: number | null;
          nome: string;
          nota_maxima: number;
        };
        Insert: {
          criado_em?: string;
          dominio_email?: string | null;
          endereco?: string | null;
          id?: string;
          latitude?: number | null;
          limite_chuva_percentual?: number;
          limite_temperatura_celsius?: number;
          longitude?: number | null;
          nome: string;
          nota_maxima?: number;
        };
        Update: {
          criado_em?: string;
          dominio_email?: string | null;
          endereco?: string | null;
          id?: string;
          latitude?: number | null;
          limite_chuva_percentual?: number;
          limite_temperatura_celsius?: number;
          longitude?: number | null;
          nome?: string;
          nota_maxima?: number;
        };
        Relationships: [];
      };
      materias: {
        Row: {
          criado_em: string;
          id: string;
          nome: string;
          professor_id: string | null;
          turma_id: string;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          nome: string;
          professor_id?: string | null;
          turma_id: string;
        };
        Update: {
          criado_em?: string;
          id?: string;
          nome?: string;
          professor_id?: string | null;
          turma_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'materias_professor_id_fkey';
            columns: ['professor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'materias_turma_id_fkey';
            columns: ['turma_id'];
            isOneToOne: false;
            referencedRelation: 'turmas';
            referencedColumns: ['id'];
          },
        ];
      };
      mensagens_chat: {
        Row: {
          apagada: boolean;
          autor_id: string | null;
          conteudo: string;
          criado_em: string;
          id: string;
          sala_id: string;
        };
        Insert: {
          apagada?: boolean;
          autor_id?: string | null;
          conteudo: string;
          criado_em?: string;
          id?: string;
          sala_id: string;
        };
        Update: {
          apagada?: boolean;
          autor_id?: string | null;
          conteudo?: string;
          criado_em?: string;
          id?: string;
          sala_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mensagens_chat_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mensagens_chat_sala_id_fkey';
            columns: ['sala_id'];
            isOneToOne: false;
            referencedRelation: 'salas_chat';
            referencedColumns: ['id'];
          },
        ];
      };
      mensagens_diretas: {
        Row: {
          apagada: boolean;
          autor_id: string;
          conteudo: string;
          conversa_id: string;
          criado_em: string;
          id: string;
        };
        Insert: {
          apagada?: boolean;
          autor_id: string;
          conteudo: string;
          conversa_id: string;
          criado_em?: string;
          id?: string;
        };
        Update: {
          apagada?: boolean;
          autor_id?: string;
          conteudo?: string;
          conversa_id?: string;
          criado_em?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mensagens_diretas_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mensagens_diretas_conversa_id_fkey';
            columns: ['conversa_id'];
            isOneToOne: false;
            referencedRelation: 'conversas';
            referencedColumns: ['id'];
          },
        ];
      };
      post_comentarios: {
        Row: {
          autor_id: string | null;
          conteudo: string;
          criado_em: string;
          id: string;
          post_id: string;
        };
        Insert: {
          autor_id?: string | null;
          conteudo: string;
          criado_em?: string;
          id?: string;
          post_id: string;
        };
        Update: {
          autor_id?: string | null;
          conteudo?: string;
          criado_em?: string;
          id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_comentarios_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_comentarios_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      post_curtidas: {
        Row: {
          autor_id: string;
          criado_em: string;
          id: string;
          post_id: string;
        };
        Insert: {
          autor_id: string;
          criado_em?: string;
          id?: string;
          post_id: string;
        };
        Update: {
          autor_id?: string;
          criado_em?: string;
          id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_curtidas_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_curtidas_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          autor_id: string | null;
          conteudo: string | null;
          criado_em: string;
          data_evento: string | null;
          id: string;
          midia_url: string | null;
          tipo: Database['public']['Enums']['tipo_post'];
          turma_id: string;
        };
        Insert: {
          autor_id?: string | null;
          conteudo?: string | null;
          criado_em?: string;
          data_evento?: string | null;
          id?: string;
          midia_url?: string | null;
          tipo?: Database['public']['Enums']['tipo_post'];
          turma_id: string;
        };
        Update: {
          autor_id?: string | null;
          conteudo?: string | null;
          criado_em?: string;
          data_evento?: string | null;
          id?: string;
          midia_url?: string | null;
          tipo?: Database['public']['Enums']['tipo_post'];
          turma_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_turma_id_fkey';
            columns: ['turma_id'];
            isOneToOne: false;
            referencedRelation: 'turmas';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          anos_reprovados: number[];
          bio: string | null;
          consentimento_responsavel: boolean;
          criado_em: string;
          email: string;
          escola_id: string | null;
          foto_url: string | null;
          id: string;
          idade: number | null;
          nome: string;
          nome_usuario: string | null;
          numero_cartao_estudante: string | null;
          papel: Database['public']['Enums']['papel_usuario'];
          publico: boolean;
          push_token: string | null;
          silenciado_ate: string | null;
          termos_aceitos_em: string | null;
          turma_id: string | null;
        };
        Insert: {
          anos_reprovados?: number[];
          bio?: string | null;
          consentimento_responsavel?: boolean;
          criado_em?: string;
          email: string;
          escola_id?: string | null;
          foto_url?: string | null;
          id: string;
          idade?: number | null;
          nome: string;
          nome_usuario?: string | null;
          numero_cartao_estudante?: string | null;
          papel?: Database['public']['Enums']['papel_usuario'];
          publico?: boolean;
          push_token?: string | null;
          silenciado_ate?: string | null;
          termos_aceitos_em?: string | null;
          turma_id?: string | null;
        };
        Update: {
          anos_reprovados?: number[];
          bio?: string | null;
          consentimento_responsavel?: boolean;
          criado_em?: string;
          email?: string;
          escola_id?: string | null;
          foto_url?: string | null;
          id?: string;
          idade?: number | null;
          nome?: string;
          nome_usuario?: string | null;
          numero_cartao_estudante?: string | null;
          papel?: Database['public']['Enums']['papel_usuario'];
          publico?: boolean;
          push_token?: string | null;
          silenciado_ate?: string | null;
          termos_aceitos_em?: string | null;
          turma_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_escola_id_fkey';
            columns: ['escola_id'];
            isOneToOne: false;
            referencedRelation: 'escolas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profiles_turma_id_fkey';
            columns: ['turma_id'];
            isOneToOne: false;
            referencedRelation: 'turmas';
            referencedColumns: ['id'];
          },
        ];
      };
      salas_chat: {
        Row: {
          criado_em: string;
          criado_por: string | null;
          escola_id: string;
          id: string;
          materia_id: string | null;
          nome: string;
          tipo: Database['public']['Enums']['tipo_sala_chat'];
          trancada: boolean;
          turma_id: string | null;
        };
        Insert: {
          criado_em?: string;
          criado_por?: string | null;
          escola_id: string;
          id?: string;
          materia_id?: string | null;
          nome: string;
          tipo: Database['public']['Enums']['tipo_sala_chat'];
          trancada?: boolean;
          turma_id?: string | null;
        };
        Update: {
          criado_em?: string;
          criado_por?: string | null;
          escola_id?: string;
          id?: string;
          materia_id?: string | null;
          nome?: string;
          tipo?: Database['public']['Enums']['tipo_sala_chat'];
          trancada?: boolean;
          turma_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'salas_chat_criado_por_fkey';
            columns: ['criado_por'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'salas_chat_escola_id_fkey';
            columns: ['escola_id'];
            isOneToOne: false;
            referencedRelation: 'escolas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'salas_chat_materia_id_fkey';
            columns: ['materia_id'];
            isOneToOne: false;
            referencedRelation: 'materias';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'salas_chat_turma_id_fkey';
            columns: ['turma_id'];
            isOneToOne: false;
            referencedRelation: 'turmas';
            referencedColumns: ['id'];
          },
        ];
      };
      seguidores: {
        Row: {
          criado_em: string;
          id: string;
          seguido_id: string;
          seguidor_id: string;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          seguido_id: string;
          seguidor_id: string;
        };
        Update: {
          criado_em?: string;
          id?: string;
          seguido_id?: string;
          seguidor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'seguidores_seguido_id_fkey';
            columns: ['seguido_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seguidores_seguidor_id_fkey';
            columns: ['seguidor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      stories: {
        Row: {
          autor_id: string;
          criado_em: string;
          expira_em: string;
          id: string;
          midia_url: string;
        };
        Insert: {
          autor_id: string;
          criado_em?: string;
          expira_em?: string;
          id?: string;
          midia_url: string;
        };
        Update: {
          autor_id?: string;
          criado_em?: string;
          expira_em?: string;
          id?: string;
          midia_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stories_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      turma_pedidos_entrada: {
        Row: {
          criado_em: string;
          id: string;
          profile_id: string;
          respondido_em: string | null;
          status: Database['public']['Enums']['status_pedido_turma'];
          turma_id: string;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          profile_id: string;
          respondido_em?: string | null;
          status?: Database['public']['Enums']['status_pedido_turma'];
          turma_id: string;
        };
        Update: {
          criado_em?: string;
          id?: string;
          profile_id?: string;
          respondido_em?: string | null;
          status?: Database['public']['Enums']['status_pedido_turma'];
          turma_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'turma_pedidos_entrada_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'turma_pedidos_entrada_turma_id_fkey';
            columns: ['turma_id'];
            isOneToOne: false;
            referencedRelation: 'turmas';
            referencedColumns: ['id'];
          },
        ];
      };
      turmas: {
        Row: {
          criado_em: string;
          criado_por: string | null;
          escola_id: string;
          id: string;
          nome: string;
          serie_ano: string;
        };
        Insert: {
          criado_em?: string;
          criado_por?: string | null;
          escola_id: string;
          id?: string;
          nome: string;
          serie_ano: string;
        };
        Update: {
          criado_em?: string;
          criado_por?: string | null;
          escola_id?: string;
          id?: string;
          nome?: string;
          serie_ano?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'turmas_criado_por_fkey';
            columns: ['criado_por'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'turmas_escola_id_fkey';
            columns: ['escola_id'];
            isOneToOne: false;
            referencedRelation: 'escolas';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      adicionar_participante_grupo: {
        Args: { p_conversa_id: string; p_novo_participante_id: string };
        Returns: undefined;
      };
      criar_conversa_direta: { Args: { p_outro_id: string }; Returns: string };
      criar_conversa_grupo: {
        Args: { p_nome: string; p_participantes_ids: string[] };
        Returns: string;
      };
      nome_usuario_disponivel: {
        Args: { p_nome_usuario: string };
        Returns: boolean;
      };
      responder_pedido_entrada_turma: {
        Args: { p_aprovar: boolean; p_pedido_id: string };
        Returns: undefined;
      };
      silenciar_usuario: {
        Args: { p_horas: number; p_perfil_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      origem_aviso: 'manual' | 'automatico';
      papel_mensagem_ia: 'usuario' | 'assistente';
      papel_participante: 'membro' | 'admin';
      papel_usuario: 'aluno' | 'professor' | 'coordenacao';
      status_denuncia: 'pendente' | 'revisado' | 'resolvido';
      status_pedido_turma: 'pendente' | 'aprovado' | 'recusado';
      tipo_aviso:
        | 'greve'
        | 'feriado'
        | 'suspensao'
        | 'mudanca_horario'
        | 'prova'
        | 'trabalho'
        | 'comunicado'
        | 'trajeto';
      tipo_conteudo_denuncia: 'post' | 'comentario' | 'mensagem' | 'mensagem_direta';
      tipo_conversa: 'direta' | 'grupo';
      tipo_post: 'texto' | 'foto' | 'evento' | 'lembrete';
      tipo_sala_chat: 'turma' | 'materia' | 'assunto';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      origem_aviso: ['manual', 'automatico'],
      papel_mensagem_ia: ['usuario', 'assistente'],
      papel_participante: ['membro', 'admin'],
      papel_usuario: ['aluno', 'professor', 'coordenacao'],
      status_denuncia: ['pendente', 'revisado', 'resolvido'],
      status_pedido_turma: ['pendente', 'aprovado', 'recusado'],
      tipo_aviso: [
        'greve',
        'feriado',
        'suspensao',
        'mudanca_horario',
        'prova',
        'trabalho',
        'comunicado',
        'trajeto',
      ],
      tipo_conteudo_denuncia: ['post', 'comentario', 'mensagem', 'mensagem_direta'],
      tipo_conversa: ['direta', 'grupo'],
      tipo_post: ['texto', 'foto', 'evento', 'lembrete'],
      tipo_sala_chat: ['turma', 'materia', 'assunto'],
    },
  },
} as const;
