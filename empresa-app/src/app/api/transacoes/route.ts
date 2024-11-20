import { NextResponse } from "next/server";
import prisma from "../../lib/PrismaClient";
// Função para validar os dados de entrada de uma transação
const validarDadosTransacao = (dados: any, isUpdate = false): boolean => {
  const { contaId, valor, tipoDeTransacao, dataTransacao, descricao } = dados;

  if (isUpdate) {
    // Validação flexível para atualizações
    return (
      valor !== undefined ||
      dataTransacao !== undefined ||
      descricao !== undefined
    );
  }

  // Validação completa para criação
  return (
    contaId &&
    typeof contaId === "number" &&
    valor !== undefined &&
    typeof valor === "number" &&
    tipoDeTransacao &&
    ["ENTRADA", "SAIDA"].includes(tipoDeTransacao) &&
    dataTransacao &&
    !isNaN(new Date(dataTransacao).getTime()) &&
    descricao &&
    typeof descricao === "string"
  );
};

// Função para ajustar o saldo de uma conta
const ajustarSaldoConta = async (contaId: number, valor: number) => {
  await prisma.conta.update({
    where: { id: contaId },
    data: { saldo: { increment: valor } },
  });
};

// verificar se o saldo da conta é suficiente para a transação
const verificarSaldoConta = async (contaId: number, valor: number) => {
  const conta = await prisma.conta.findUnique({ where: { id: contaId } });
  if (!conta) return false;

  return Number(conta.saldo) + valor >= 0;
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

    const filtros: any = {};
    const tipoDeTransacao = searchParams.get("tipoDeTransacao");
    const contaId = searchParams.get("contaId");

    if (tipoDeTransacao) {
      filtros.tipoDeTransacao = tipoDeTransacao;
    }

    if (contaId) {
      const parsedContaId = parseInt(contaId, 10);
      if (!isNaN(parsedContaId)) {
        filtros.contaId = parsedContaId;
      }
    }

    // Consultar transações com categorias
    const transacoes = await prisma.transacao.findMany({
      where: filtros,
      include: {
        categorias: {
          include: {
            categoria: true, // Inclui informações detalhadas da categoria
          },
        },
      },
      orderBy: { id: "asc" }, // Ordenação por ID crescente
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
 *     tags: [Transações]
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
 *               categorias:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Transação criada com sucesso.
 *       400:
 *         description: Dados incompletos ou inválidos.
 *       500:
 *         description: Erro interno ao criar a transação.
 */

export async function POST(request: Request) {
  try {
    const dados = await request.json();

    // Valida os dados da transação
    if (!validarDadosTransacao(dados)) {
      return NextResponse.json(
        { error: "Dados incompletos para criar transação" },
        { status: 400 }
      );
    }

    const { contaId, valor, tipoDeTransacao, dataTransacao, descricao, categorias } = dados;

    // Verifica se a conta existe
    const conta = await prisma.conta.findUnique({ where: { id: contaId } });
    if (!conta) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 400 });
    }

    // Verifica se o saldo é suficiente para transações de saída
    if (tipoDeTransacao === "SAIDA" && !(await verificarSaldoConta(contaId, -valor))) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }

    // Valida as categorias
    if (categorias && Array.isArray(categorias)) {
      const categoriasExistentes = await prisma.categoriaDeTransacao.findMany({
        where: { id: { in: categorias } },
      });

      if (categoriasExistentes.length !== categorias.length) {
        return NextResponse.json(
          { error: "Uma ou mais categorias fornecidas não existem" },
          { status: 400 }
        );
      }
    }

    // Cria a transação
    const novaTransacao = await prisma.transacao.create({
      data: {
        contaId,
        valor,
        dataTransacao: new Date(dataTransacao),
        descricao,
        tipoDeTransacao,
      },
    });

    // Cria as associações com categorias
    if (categorias && Array.isArray(categorias)) {
      const categoriasData = categorias.map((categoriaId: number) => ({
        transacaoId: novaTransacao.id,
        categoriaId,
      }));

      await prisma.transacaoParaCategoria.createMany({
        data: categoriasData,
      });
    }

    // Ajusta o saldo da conta
    const ajusteSaldo = tipoDeTransacao === "ENTRADA" ? valor : -valor;
    await ajustarSaldoConta(contaId, ajusteSaldo);

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
 * /api/transacoes?id={id}:
 *   put:
 *     summary: Atualiza uma transação
 *     tags: [Transações]
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
 *               tipoDeTransacao:
 *                 type: string
 *                 enum: [ENTRADA, SAIDA]
 *               dataTransacao:
 *                 type: string
 *                 format: date-time
 *                 description: Nova data da transação
 *               descricao:
 *                 type: string
 *                 description: Nova descrição da transação
 *               categorias:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Transação atualizada com sucesso
 *       400:
 *         description: Dados incompletos ou inválidos
 *       404:
 *         description: Transação não encontrada
 *       500:
 *         description: Erro interno ao atualizar transação
 */

export async function PUT(request: Request) {
  try {
    // Obtém o ID da transação dos parâmetros da URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID da transação não fornecido" },
        { status: 400 }
      );
    }

    // Obtém os dados da requisição
    const dados = await request.json();
    if (!validarDadosTransacao(dados, true)) {
      return NextResponse.json(
        { error: "Dados incompletos ou inválidos para atualização" },
        { status: 400 }
      );
    }

    // Busca a transação existente
    const transacaoAntiga = await prisma.transacao.findUnique({
      where: { id: Number(id) },
      include: { categorias: true }, // Inclui categorias associadas
    });

    if (!transacaoAntiga) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    // Ajuste do saldo da conta (remove o saldo antigo e aplica o novo)
    const ajusteSaldoAntigo =
      transacaoAntiga.tipoDeTransacao === "ENTRADA"
        ? -transacaoAntiga.valor
        : transacaoAntiga.valor;
    const ajusteSaldoNovo =
      dados.tipoDeTransacao === "ENTRADA" ? dados.valor : -dados.valor;

    // Verifica se o saldo é suficiente caso o tipo seja SAÍDA
    if (
      dados.tipoDeTransacao === "SAIDA" &&
      !(await verificarSaldoConta(transacaoAntiga.contaId, ajusteSaldoNovo))
    ) {
      return NextResponse.json(
        { error: "Saldo insuficiente para a transação" },
        { status: 400 }
      );
    }

    // Atualiza os dados da transação
    const transacaoAtualizada = await prisma.transacao.update({
      where: { id: Number(id) },
      data: {
        valor: dados.valor,
        tipoDeTransacao: dados.tipoDeTransacao,
        dataTransacao: new Date(dados.dataTransacao),
        descricao: dados.descricao,
      },
    });

    if (dados.categorias && Array.isArray(dados.categorias)) {
      const categoriasData = dados.categorias.map((categoriaId: number) => ({
        transacaoId: dados.novaTransacao.id,
        categoriaId,
      }));
    
      await prisma.transacaoParaCategoria.createMany({
        data: categoriasData,
      });
    }

    // Ajusta o saldo da conta
    await ajustarSaldoConta(
      transacaoAntiga.contaId,
      ajusteSaldoAntigo + ajusteSaldoNovo
    );

    return NextResponse.json(transacaoAtualizada, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar transação" },
      { status: 500 }
    );
  }
}

// Exclusão de uma transação
/**
 * @swagger
 * /api/transacoes:
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
 *         description: ID da transação não fornecido ou inválido
 *       404:
 *         description: Transação não encontrada
 *       500:
 *         description: Erro ao remover transação
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Verifica se o ID é válido
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "ID da transação inválido ou não fornecido" },
        { status: 400 }
      );
    }

    const transacaoId = Number(id);

    // Busca a transação e suas categorias relacionadas
    const transacao = await prisma.transacao.findUnique({
      where: { id: transacaoId },
      include: {
        categorias: true, // Inclui as categorias relacionadas
      },
    });

    // Verifica se a transação existe
    if (!transacao) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    // Calcula o ajuste no saldo com base no tipo de transação
    const ajusteSaldo =
      transacao.tipoDeTransacao === "ENTRADA"
        ? -Number(transacao.valor)
        : Number(transacao.valor);

    // Remove categorias associadas na tabela intermediária
    await prisma.transacaoParaCategoria.deleteMany({
      where: { transacaoId },
    });

    // Remove a transação
    await prisma.transacao.delete({
      where: { id: transacaoId },
    });

    // Ajusta o saldo da conta
    await prisma.conta.update({
      where: { id: transacao.contaId },
      data: { saldo: { increment: ajusteSaldo } },
    });

    // Retorna uma mensagem de sucesso
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
