import { NextResponse } from "next/server";
import prisma from "../../lib/PrismaClient";

// Função para ajustar o saldo de uma conta (para o caso de uma transação ser excluída)
const ajustarSaldoConta = async (conta_id: number, valor: number) => {
  await prisma.conta.update({
    where: { id: conta_id },
    data: { saldo: { increment: valor } }, // Decrementa ou incrementa o saldo conforme o tipo de transação
  });
};

// Verificar se o saldo da conta é suficiente para a transação
const verificarSaldoConta = async (conta_id: number, valor: number) => {
  const conta = await prisma.conta.findUnique({ where: { id: conta_id } });
  if (!conta) return false;

  return Number(conta.saldo) + valor >= 0;
};

const validarDadosTransacao = async (dados: any, isUpdate = false): Promise<boolean> => {
  if (!dados) return false;

  const { conta_id, valor, tipoDeTransacao, dataTransacao, descricao } = dados;

  // Verifique se conta_id está presente
  console.log("conta_id recebido:", conta_id);

  const conta = await prisma.conta.findUnique({ where: { id: conta_id } });
  console.log("Conta encontrada:", conta);

  if (
    !conta_id ||  // Verifique se conta_id existe
    isNaN(Number(conta_id)) || 
    !valor || 
    isNaN(Number(valor)) || 
    !tipoDeTransacao || 
    !["ENTRADA", "SAIDA"].includes(tipoDeTransacao) || 
    !dataTransacao || 
    isNaN(Date.parse(dataTransacao)) || 
    !descricao
  ) {
    return false;
  }

  if (!isUpdate && !dados.categorias) return false;

  return true;
};


/**
 * @swagger
 * tags:
 *   - name: Transações
 *     description: Operações relacionadas às transações
 */

// Listagem de todas as transações
/**
 * @swagger
 * /api/transacoes:
 *   get:
 *     summary: Lista todas as transações
 *     tags:
 *       - Transações
 *     description: Obtém todas as transações do banco de dados, com as informações detalhadas das contas associadas.
 *     parameters:
 *       - name: tipoDeTransacao
 *         in: query
 *         required: false
 *         description: Filtra as transações pelo tipo (ENTRADA ou SAIDA)
 *         schema:
 *           type: string
 *           enum: [ENTRADA, SAIDA]
 *       - name: conta_id
 *         in: query
 *         required: false
 *         description: Filtra as transações por uma conta específica
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de transações retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: ID da transação
 *                     example: 1
 *                   conta_id:
 *                     type: integer
 *                     description: ID da conta associada
 *                     example: 3
 *                   valor:
 *                     type: number
 *                     description: Valor da transação
 *                     example: 500.00
 *                   tipoDeTransacao:
 *                     type: string
 *                     description: Tipo da transação (ENTRADA ou SAIDA)
 *                     example: "ENTRADA"
 *                   descricao:
 *                     type: string
 *                     description: Descrição da transação
 *                     example: "Salário recebido"
 *                   dataTransacao:
 *                     type: string
 *                     format: date-time
 *                     description: Data e hora da transação
 *                     example: "2024-11-15T18:12:33.655Z"
 *                   criadoEm:
 *                     type: string
 *                     format: date-time
 *                     description: Data e hora de criação da transação
 *                     example: "2024-11-15T19:00:00.000Z"
 *       500:
 *         description: Erro interno ao buscar transações.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "Erro ao buscar transações"
 */
// Listagem de todas as transações
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Obtém os parâmetros da URL
    const tipoDeTransacao = searchParams.get("tipoDeTransacao");
    const conta_id = searchParams.get("conta_id");

    // Cria o objeto de filtro
    const filtros: any = {};
    
    // Aplica o filtro de tipoDeTransacao se fornecido
    if (tipoDeTransacao) {
      if (["ENTRADA", "SAIDA"].includes(tipoDeTransacao)) {
        filtros.tipoDeTransacao = tipoDeTransacao;
      } else {
        return NextResponse.json(
          { error: "Tipo de transação inválido. Use 'ENTRADA' ou 'SAIDA'." },
          { status: 400 }
        );
      }
    }

    // Aplica o filtro de conta_id se fornecido e válido
    if (conta_id) {
      const parsedContaId = parseInt(conta_id, 10);
      if (!isNaN(parsedContaId)) {
        filtros.conta_id = parsedContaId;
      } else {
        return NextResponse.json(
          { error: "ID da conta inválido." },
          { status: 400 }
        );
      }
    }

    // Consulta as transações com os filtros aplicados
    const transacoes = await prisma.transacao.findMany({
      where: filtros,
      include: {
        transacoes_para_categorias: {
          include: {
            categoria: true, // Inclui informações detalhadas da categoria
          },
        },
      },
      orderBy: { id: "asc" }, // Ordena pela ID crescente
    });

    // Retorna as transações encontradas
    return NextResponse.json(transacoes, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar transações." },
      { status: 500 }
    );
  }
}


/**
 * @swagger
 * /api/transacoes:
 *   post:
 *     summary: Cria uma nova transação
 *     tags:
 *       - Transações
 *     description: Adiciona uma nova transação ao banco de dados.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuario_id:
 *                 type: integer
 *                 description: ID do usuário responsável pela transação.
 *                 example: 1
 *               conta_id:
 *                 type: integer
 *                 description: ID da conta associada à transação.
 *                 example: 2
 *               valor:
 *                 type: number
 *                 description: Valor da transação.
 *                 example: 150.75
 *               tipoDeTransacao:
 *                 type: string
 *                 description: Tipo da transação, podendo ser 'ENTRADA' ou 'SAIDA'.
 *                 enum:
 *                   - ENTRADA
 *                   - SAIDA
 *                 example: ENTRADA
 *               dataTransacao:
 *                 type: string
 *                 format: date-time
 *                 description: Data e hora da transação.
 *                 example: "2024-11-23T18:17:27.113Z"
 *               descricao:
 *                 type: string
 *                 description: Descrição detalhada da transação.
 *                 example: "Pagamento de aluguel"
 *               categorias:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   description: IDs das categorias associadas à transação.
 *                 example: [1, 2]
 *     responses:
 *       200:
 *         description: Transação criada com sucesso.
 *       400:
 *         description: Dados incompletos ou inválidos.
 *       403:
 *         description: A conta não pertence ao usuário informado.
 *       500:
 *         description: Erro interno ao criar a transação.
 */

// Função de POST para criar transação
export async function POST(request: Request) {
  try {
    const dados = await request.json();

    console.log("Dados recebidos:", dados); // Verifique o que está sendo recebido

    // Validação inicial dos dados
    if (!validarDadosTransacao(dados)) {
      console.log("Dados inválidos:", dados); // Adicione esse log
      return NextResponse.json(
        { error: "Dados incompletos para criar transação" },
        { status: 400 }
      );
    }

    const { usuario_id, conta_id, valor, tipoDeTransacao, dataTransacao, descricao, categorias } = dados;

    // Verifica se a conta existe
    const conta = await prisma.conta.findUnique({ where: { id: conta_id } });
    if (!conta) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 400 });
    }

    // Verifica se a conta pertence ao usuário informado
    if (conta.usuarioId !== usuario_id) {
      return NextResponse.json(
        { error: "A conta não pertence ao usuário informado" },
        { status: 403 }
      );
    }

    // Verifica saldo suficiente para transações do tipo SAÍDA
    if (tipoDeTransacao === "SAIDA" && !(await verificarSaldoConta(conta_id, -valor))) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }

    // Cria a transação no banco de dados
    const novaTransacao = await prisma.transacao.create({
      data: {
        conta_id,
        usuario_id, // Adiciona o usuario_id diretamente na transação
        valor,
        dataTransacao: new Date(dataTransacao),
        descricao,
        tipoDeTransacao
      },
    });

    console.log("Transação criada:", novaTransacao); // Log do sucesso

    // Associa categorias à transação
    if (categorias && Array.isArray(categorias)) {
      await Promise.all(
        categorias.map((categoria_id: number) =>
          prisma.transacaoParaCategoria.create({
            data: {
              transacao_id: novaTransacao.id, // Referência correta
              categoria_id: categoria_id,
            },
          })
        )
      );
    }

    // Ajusta o saldo da conta
    const ajusteSaldo = tipoDeTransacao === "ENTRADA" ? Number(valor) : -Number(valor);
    await ajustarSaldoConta(conta_id, ajusteSaldo);

    return NextResponse.json(novaTransacao, { status: 200 });
  } catch (error) {
    console.error("Erro ao criar transação:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar transação" },
      { status: 500 }
    );
  }
}


/**
 * @swagger
 * /api/transacoes:
 *   put:
 *     summary: Atualiza uma transação
 *     tags:
 *       - Transações
 *     description: Atualiza os dados de uma transação específica no banco de dados. O `usuario_id` é obrigatório para validar a operação.
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         description: ID da transação a ser atualizada.
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: usuario_id
 *         in: query
 *         required: true
 *         description: ID do usuário associado à transação.
 *         schema:
 *           type: integer
 *           example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valor:
 *                 type: number
 *                 description: Novo valor da transação.
 *                 example: 200.50
 *               tipoDeTransacao:
 *                 type: string
 *                 enum:
 *                   - ENTRADA
 *                   - SAIDA
 *                 description: Tipo da transação.
 *                 example: ENTRADA
 *               dataTransacao:
 *                 type: string
 *                 format: date-time
 *                 description: Nova data da transação.
 *                 example: "2024-11-23T18:17:27.113Z"
 *               descricao:
 *                 type: string
 *                 description: Nova descrição da transação.
 *                 example: "Pagamento recebido"
 *               categorias:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs das categorias associadas à transação.
 *                 example: [1, 2]
 *     responses:
 *       200:
 *         description: Transação atualizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID da transação atualizada.
 *                   example: 1
 *                 conta_id:
 *                   type: integer
 *                   description: ID da conta associada à transação.
 *                   example: 2
 *                 valor:
 *                   type: number
 *                   description: Valor atualizado da transação.
 *                   example: 200.50
 *                 tipoDeTransacao:
 *                   type: string
 *                   description: Tipo atualizado da transação.
 *                   example: "ENTRADA"
 *                 descricao:
 *                   type: string
 *                   description: Descrição atualizada da transação.
 *                   example: "Pagamento recebido"
 *                 dataTransacao:
 *                   type: string
 *                   format: date-time
 *                   description: Nova data da transação.
 *                   example: "2024-11-23T18:17:27.113Z"
 *       400:
 *         description: Parâmetros ou dados inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "Dados incompletos ou inválidos"
 *       403:
 *         description: Transação não pertence ao usuário informado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "A transação não pertence ao usuário informado"
 *       404:
 *         description: Transação não encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "Transação não encontrada"
 *       500:
 *         description: Erro interno ao atualizar transação.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "Erro interno ao atualizar transação"
 */

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "ID da transação não fornecido ou inválido" },
        { status: 400 }
      );
    }

    const dados = await request.json();
    const { usuario_id, conta_id } = dados;

    // Busca a transação existente
    const transacaoAntiga = await prisma.transacao.findUnique({
      where: { id: Number(id) },
    });

    if (!transacaoAntiga) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    // Verifica se a conta pertence ao usuário
    const conta = await prisma.conta.findUnique({ where: { id: conta_id } });
    if (!conta || conta.usuarioId !== usuario_id) {
      return NextResponse.json(
        { error: "A conta não pertence ao usuário informado" },
        { status: 403 }
      );
    }

    // Atualiza a transação
    const transacaoAtualizada = await prisma.transacao.update({
      where: { id: Number(id) },
      data: { ...dados },
    });

    return NextResponse.json(transacaoAtualizada, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar transação" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/transacoes:
 *   delete:
 *     summary: Remove uma transação
 *     tags:
 *       - Transações
 *     description: Remove uma transação específica do banco de dados. É necessário passar o `id` da transação e o `usuario_id` para validação.
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         description: ID da transação a ser removida.
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: usuario_id
 *         in: query
 *         required: true
 *         description: ID do usuário associado à transação.
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Transação removida com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem de sucesso.
 *                   example: "Transação removida com sucesso"
 *       400:
 *         description: Parâmetros inválidos ou não fornecidos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "ID ou usuario_id inválido ou não fornecido"
 *       403:
 *         description: Transação não pertence ao usuário informado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "A transação não pertence ao usuário informado"
 *       404:
 *         description: Transação não encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "Transação não encontrada"
 *       500:
 *         description: Erro interno ao remover a transação.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro.
 *                   example: "Erro interno ao remover transação"
 */

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const usuario_id = searchParams.get("usuario_id");

    if (!id || isNaN(Number(id)) || !usuario_id || isNaN(Number(usuario_id))) {
      return NextResponse.json(
        { error: "ID inválido ou não fornecido" },
        { status: 400 }
      );
    }

    const transacao_id = Number(id);

    // Busca a transação
    const transacao = await prisma.transacao.findUnique({
      where: { id: transacao_id },
      include: { conta: true },
    });

    if (!transacao) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    // Verifica se a conta pertence ao usuário
    if (transacao.conta.usuarioId !== Number(usuario_id)) {
      return NextResponse.json(
        { error: "A transação não pertence ao usuário informado" },
        { status: 403 }
      );
    }

    // Remove a transação
    await prisma.transacao.delete({ where: { id: transacao_id } });

    return NextResponse.json({ message: "Transação removida com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir transação:", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir transação" },
      { status: 500 }
    );
  }
}