import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import {
  avaliarExpressao,
  derivarPolinomio,
  interpretarQuadratica,
  resolverQuadratica,
  type ResultadoQuadratica,
} from '@/features/estudo/ferramentasCalculo';

/** Cartão de ferramenta — mesmo formato pros 3 (calculadora, equação,
 * derivada): título com ícone, campo, botão, e o resultado/erro aparece
 * embaixo só depois de calcular. */
function CartaoFerramenta({
  icone,
  titulo,
  descricao,
  children,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-100 bg-surface p-4 shadow-sm dark:border-slate-100 dark:bg-surface-dark">
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dark/10">
          <Ionicons name={icone} size={18} color="#8B5CF6" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900">{titulo}</Text>
          <Text className="text-xs text-slate-500">{descricao}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function CaixaResultado({ children }: { children: React.ReactNode }) {
  return (
    <View className="gap-1.5 rounded-xl bg-primary/5 p-3 dark:bg-primary-dark/10">{children}</View>
  );
}

function CaixaErro({ mensagem }: { mensagem: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-xl bg-danger/10 p-3 dark:bg-danger-dark/10">
      <Ionicons name="alert-circle" size={14} color="#F87171" />
      <Text className="flex-1 text-sm text-danger dark:text-danger-dark">{mensagem}</Text>
    </View>
  );
}

/** Calculadora científica — avalia a expressão localmente (sem
 * `eval`/`Function`, ver `ferramentasCalculo.ts`). Funciona offline e sem
 * chamar a Edge Function de IA. */
function FerramentaCalculadora() {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function calcular() {
    try {
      setResultado(avaliarExpressao(texto).resultado);
      setErro(null);
    } catch (e) {
      setResultado(null);
      setErro(e instanceof Error ? e.message : 'Não consegui calcular.');
    }
  }

  return (
    <CartaoFerramenta
      icone="calculator-outline"
      titulo="Calculadora"
      descricao="Expressões com +, −, ×, ÷, potência e funções (sqrt, sin, cos, log...)"
    >
      <TextField
        label="Expressão"
        value={texto}
        onChangeText={setTexto}
        placeholder="ex.: 2*(3+4)^2 ou sqrt(81)"
        autoCapitalize="none"
      />
      <Button label="Calcular" variant="secondary" onPress={calcular} />
      {resultado !== null ? (
        <CaixaResultado>
          <Text className="text-lg font-bold text-primary dark:text-primary-dark">
            = {resultado}
          </Text>
        </CaixaResultado>
      ) : null}
      {erro ? <CaixaErro mensagem={erro} /> : null}
    </CartaoFerramenta>
  );
}

/** Equação do 2.º grau — aceita "2x^2 - 5x + 3 = 0" direto, ou os
 * coeficientes a/b/c separados por vírgula. */
function FerramentaQuadratica() {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoQuadratica | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function calcular() {
    try {
      const partes = texto.split(',').map((p) => p.trim());
      const { a, b, c } =
        partes.length === 3 && partes.every((p) => p !== '' && !Number.isNaN(Number(p)))
          ? { a: Number(partes[0]), b: Number(partes[1]), c: Number(partes[2]) }
          : interpretarQuadratica(texto);
      setResultado(resolverQuadratica(a, b, c));
      setErro(null);
    } catch (e) {
      setResultado(null);
      setErro(e instanceof Error ? e.message : 'Não consegui resolver.');
    }
  }

  return (
    <CartaoFerramenta
      icone="git-branch-outline"
      titulo="Equação do 2.º grau"
      descricao='Escreve a equação (ex.: "2x^2 - 5x + 3 = 0") ou os coeficientes "a, b, c"'
    >
      <TextField
        label="Equação ou coeficientes"
        value={texto}
        onChangeText={setTexto}
        placeholder="2x^2 - 5x + 3 = 0"
        autoCapitalize="none"
      />
      <Button label="Resolver" variant="secondary" onPress={calcular} />
      {resultado ? (
        <CaixaResultado>
          <Text className="text-base font-bold text-primary dark:text-primary-dark">
            {resultado.exibicao}
          </Text>
          {resultado.passos.map((passo, i) => (
            <Text key={i} className="text-xs text-slate-600">
              {passo}
            </Text>
          ))}
        </CaixaResultado>
      ) : null}
      {erro ? <CaixaErro mensagem={erro} /> : null}
    </CartaoFerramenta>
  );
}

/** Derivada de polinómios em x, termo a termo (regra da potência). */
function FerramentaDerivada() {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<{ derivada: string; passos: string[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function calcular() {
    try {
      setResultado(derivarPolinomio(texto));
      setErro(null);
    } catch (e) {
      setResultado(null);
      setErro(e instanceof Error ? e.message : 'Não consegui derivar.');
    }
  }

  return (
    <CartaoFerramenta
      icone="trending-up-outline"
      titulo="Derivada"
      descricao="Polinómio em x (ex.: 3x^4 - 2x^2 + 5x - 7)"
    >
      <TextField
        label="Polinómio f(x)"
        value={texto}
        onChangeText={setTexto}
        placeholder="3x^4 - 2x^2 + 5x - 7"
        autoCapitalize="none"
      />
      <Button label="Derivar" variant="secondary" onPress={calcular} />
      {resultado ? (
        <CaixaResultado>
          <Text className="text-base font-bold text-primary dark:text-primary-dark">
            f&apos;(x) = {resultado.derivada}
          </Text>
          {resultado.passos.slice(0, -1).map((passo, i) => (
            <Text key={i} className="text-xs text-slate-600">
              {passo}
            </Text>
          ))}
        </CaixaResultado>
      ) : null}
      {erro ? <CaixaErro mensagem={erro} /> : null}
    </CartaoFerramenta>
  );
}

/**
 * Ferramentas de cálculo do Explicador — pedido do usuário (portar o
 * motor local de `services/tutor/math.js` do projeto de referência
 * `TurmaTestes-main`). Fica numa tela própria em vez de dentro do chat
 * de `estudo.tsx` porque é uma ferramenta determinística (mesma entrada
 * sempre dá a mesma conta), diferente do chat com IA — misturar os dois
 * no mesmo fluxo confundiria qual resposta é "calculada" e qual é
 * "gerada". O botão de acesso fica ao lado do de Flashcards no cabeçalho
 * de Estudo.
 */
export default function FerramentasEstudo() {
  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      <Text className="text-sm text-slate-500">
        Contas exatas, calculadas na hora — sem depender da IA nem de internet.
      </Text>
      <FerramentaCalculadora />
      <FerramentaQuadratica />
      <FerramentaDerivada />
    </ScrollView>
  );
}
