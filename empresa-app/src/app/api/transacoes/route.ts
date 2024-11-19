import { NextResponse } from "next/server";
import prisma from "../../lib/PrismaClient";

// Função auxiliar para validar entrada de dados
const validarDadosTransacao = (dados: any, isUpdate = false) => {
  const { contaId, valor, tipoDeTransacao, dataTransacao, descricao } = dados;

  if (isUpdate) {
    // Validação flexível para atualizações
    if (valor === undefined && !dataTransacao && !descricao) {
      return false;
    }
  } else {
    // Validação completa para criação
    if (
      !contaId ||
      valor === undefined ||
      !tipoDeTransacao ||
      !dataTransacao ||
      !descricao
    ) {
      return false;
    }
  }

  return true;
};

// Função auxiliar para ajustar saldo da conta
const ajustarSaldoConta = async (contaId: number, valor: number) => {
  await prisma.conta.update({
    where: { id: contaId },
    data: { saldo: { increment: valor } },
  });
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
 *       - name: contaId
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
 *                   contaId:
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
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipoDeTransacao = searchParams.get("tipoDeTransacao");
    const contaId = searchParams.get("contaId");

    const filtros: any = {};
    if (tipoDeTransacao) filtros.tipoDeTransacao = tipoDeTransacao;
    if (contaId) filtros.contaId = Number(contaId);

    const transacoes = await prisma.transacao.findMany({
      where: filtros,
      orderBy: { id: "asc" },
    });

    return NextResponse.json(transacoes, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transações" },
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
 *               contaId:
 *                 type: integer
 *               valor:
 *                 type: number
 *               tipoDeTransacao:
 *                 type: string
 *                 enum: [ENTRADA, SAIDA]
 *               dataTransacao:
 *                 type: string
 *                 format: date-time
 *               descricao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transação criada com sucesso.
 *       400:
 *         description: Dados incompletos para criar transação.
 *       500:
 *         description: Erro interno ao criar transação.
 */
export async function POST(request: Request) {
  try {
    const dados = await request.json();

    if (!validarDadosTransacao(dados)) {
      return NextResponse.json(
        { error: "Dados incompletos para criar transação" },
        { status: 400 }
      );
    }

    const { contaId, valor, tipoDeTransacao, dataTransacao, descricao } = dados;

    // Verifica se a conta existe antes de criar a transação
    const conta = await prisma.conta.findUnique({ where: { id: contaId } });
    if (!conta) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 400 }
      );
    }

    // Criação da transação no banco
    const novaTransacao = await prisma.transacao.create({
      data: {
        contaId,
        valor,
        dataTransacao: new Date(dataTransacao),
        descricao,
        tipoDeTransacao,
      },
    });

    // Retorna a transação criada
    return NextResponse.json(novaTransacao, { status: 200 });
  } catch (error) {
    console.error("Erro ao criar transação:", error);
    return NextResponse.json(
      { error: "Erro ao criar transação" },
      { status: 500 }
    );
  }
}

// Atualização de uma transação
/**
 * @swagger
 * /api/transacoes?id={id}:
 *   put:
 *     summary: Atualiza uma transação
 *     tags:
 *       - Transações
 *     description: Atualiza as informações de uma transação específica no banco de dados.
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         description: ID da transação a ser atualizada
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valor:
 *                 type: number
 *                 description: Novo valor da transação
 *                 example: 150.00
 *               tipoDeTransacao:
 *                 type: string
 *                 enum: [ENTRADA, SAIDA]
 *                 description: Tipo da transação (ENTRADA ou SAIDA)
 *                 example: "ENTRADA"
 *               dataTransacao:
 *                 type: string
 *                 format: date-time
 *                 description: Nova data da transação
 *                 example: "2024-11-18T10:30:00.000Z"
 *               descricao:
 *                 type: string
 *                 description: Nova descrição da transação
 *                 example: "Pagamento de serviços"
 *     responses:
 *       200:
 *         description: Transação atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID da transação atualizada
 *                   example: 1
 *                 contaId:
 *                   type: integer
 *                   description: ID da conta vinculada
 *                   example: 3
 *                 valor:
 *                   type: number
 *                   description: Valor atualizado da transação
 *                   example: 150.00
 *                 tipoDeTransacao:
 *                   type: string
 *                   description: Tipo atualizado da transação
 *                   example: "ENTRADA"
 *                 descricao:
 *                   type: string
 *                   description: Nova descrição da transação
 *                   example: "Pagamento de serviços"
 *                 dataTransacao:
 *                   type: string
 *                   format: date-time
 *                   description: Data atualizada da transação
 *                   example: "2024-11-18T10:30:00.000Z"
 *                 criadoEm:
 *                   type: string
 *                   format: date-time
 *                   description: Data e hora de criação da transação
 *                   example: "2024-11-15T10:00:00.000Z"
 *       400:
 *         description: ID da transação não fornecido ou dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro detalhada
 *                   example: "ID da transação não fornecido"
 *       404:
 *         description: Transação não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro
 *                   example: "Transação não encontrada"
 *       500:
 *         description: Erro interno ao atualizar transação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro
 *                   example: "Erro ao atualizar transação"
 */

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID da transação não fornecido" }, { status: 400 });
    }

    const dados = await request.json();
    if (!validarDadosTransacao(dados, true)) {
      return NextResponse.json({ error: "Dados incompletos ou inválidos" }, { status: 400 });
    }

    const transacaoAntiga = await prisma.transacao.findUnique({
      where: { id: Number(id) },
    });
    if (!transacaoAntiga) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    const ajusteSaldoAntigo =
      transacaoAntiga.tipoDeTransacao === "ENTRADA"
        ? -transacaoAntiga.valor
        : transacaoAntiga.valor;
    const ajusteSaldoNovo =
      dados.tipoDeTransacao === "ENTRADA" ? dados.valor : -dados.valor;

    const transacaoAtualizada = await prisma.transacao.update({
      where: { id: Number(id) },
      data: { ...dados, dataTransacao: new Date(dados.dataTransacao) },
    });

    await ajustarSaldoConta(
      transacaoAntiga.contaId,
      ajusteSaldoAntigo + ajusteSaldoNovo
    );
   

    return NextResponse.json(transacaoAtualizada, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json({ error: "Erro ao atualizar transação" }, { status: 500 });
  }
}


// Exclusão de uma transação
/**
 * @swagger
 * /api/transacoes?id={id}:
 *   delete:
 *     summary: Remove uma transação
 *     tags: [Transações]
 *     description: Remove uma transação específica do banco de dados.
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         description: ID da transação a ser removida
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transação removida com sucesso
 *       400:
 *         description: ID da transação não fornecido
 *       404:
 *         description: Transação não encontrada
 *       500:
 *         description: Erro ao remover transação
 */


// Exclusão de uma transação
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "ID da transação inválido ou não fornecido" },
        { status: 400 }
      );
    }

    const transacao = await prisma.transacao.findUnique({
      where: { id: Number(id) },
      include: { logs: true },
    });

    if (!transacao) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    const ajusteSaldo =
      transacao.tipoDeTransacao === "ENTRADA"
        ? -transacao.valor
        : transacao.valor;

    // Remover logs relacionados, se necessário
    await prisma.transacaoLog.deleteMany({
      where: { transacaoId: Number(id) },
    });

    // Remover a transação
    await prisma.transacao.delete({ where: { id: Number(id) } });

    // Ajustar saldo da conta
    await ajustarSaldoConta(transacao.contaId, Number(ajusteSaldo));

    return NextResponse.json(
      { message: "Transação removida com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao remover transação:", error);
    return NextResponse.json(
      { error: "Erro ao remover transação" },
      { status: 500 }
    );
  }
}