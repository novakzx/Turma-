// Gerado por `mcp__supabase__generate_typescript_types` a partir do schema
// real do projeto (supabase/migrations). Pra regenerar depois de uma nova
// migration, use o MCP do Supabase ou:
//
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// Não edite à mão — mudanças de schema entram por migration, não aqui.
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
          criado_em: string;
          email: string;
          escola_id: string | null;
          foto_url: string | null;
          id: string;
          nome: string;
          papel: Database['public']['Enums']['papel_usuario'];
          push_token: string | null;
          silenciado_ate: string | null;
          turma_id: string | null;
        };
        Insert: {
          criado_em?: string;
          email: string;
          escola_id?: string | null;
          foto_url?: string | null;
          id: string;
          nome: string;
          papel?: Database['public']['Enums']['papel_usuario'];
          push_token?: string | null;
          silenciado_ate?: string | null;
          turma_id?: string | null;
        };
        Update: {
          criado_em?: string;
          email?: string;
          escola_id?: string | null;
          foto_url?: string | null;
          id?: string;
          nome?: string;
          papel?: Database['public']['Enums']['papel_usuario'];
          push_token?: string | null;
          silenciado_ate?: string | null;
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
      turmas: {
        Row: {
          criado_em: string;
          escola_id: string;
          id: string;
          nome: string;
          serie_ano: string;
        };
        Insert: {
          criado_em?: string;
          escola_id: string;
          id?: string;
          nome: string;
          serie_ano: string;
        };
        Update: {
          criado_em?: string;
          escola_id?: string;
          id?: string;
          nome?: string;
          serie_ano?: string;
        };
        Relationships: [
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
      [_ in never]: never;
    };
    Enums: {
      origem_aviso: 'manual' | 'automatico';
      papel_mensagem_ia: 'usuario' | 'assistente';
      papel_usuario: 'aluno' | 'professor' | 'coordenacao';
      status_denuncia: 'pendente' | 'revisado' | 'resolvido';
      tipo_aviso:
        | 'greve'
        | 'feriado'
        | 'suspensao'
        | 'mudanca_horario'
        | 'prova'
        | 'trabalho'
        | 'comunicado'
        | 'trajeto';
      tipo_conteudo_denuncia: 'post' | 'comentario' | 'mensagem';
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
      papel_usuario: ['aluno', 'professor', 'coordenacao'],
      status_denuncia: ['pendente', 'revisado', 'resolvido'],
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
      tipo_conteudo_denuncia: ['post', 'comentario', 'mensagem'],
      tipo_post: ['texto', 'foto', 'evento', 'lembrete'],
      tipo_sala_chat: ['turma', 'materia', 'assunto'],
    },
  },
} as const;
