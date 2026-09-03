import type { Enums, Tables } from '@/types/database';

export type Turma = Tables<'turmas'>;
export type PedidoEntradaTurma = Tables<'turma_pedidos_entrada'>;
export type StatusPedidoTurma = Enums<'status_pedido_turma'>;
