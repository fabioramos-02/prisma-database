import { NextResponse } from "next/server";
import prisma from "../../lib/PrismaClient";

/**
 * @swagger
 * tags:
 *   - name: Categorias
 *     description: Operações relacionadas às categorias de transação
 */

/**
 * @swagger
 * /api/categorias:
 *   post:
 *     summary: Cria uma nova categoria
 *     tags: [Categorias]
 *     description: Adiciona uma nova categoria ao banco de dados.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome_da_categoria:
 *                 type: string
 *                 description: Nome da categoria de transação
 *                 example: "Alimentação"
 *     responses:
 *       200:
 *         description: Categoria criada com sucesso
 *       400:
 *         description: Nome da categoria é obrigatório ou já existe
 *       500:
 *         description: Erro ao criar categoria
 */
export async function POST(request: Request) {
  try {
    const { nome_da_categoria } = await request.json();

    if (!nome_da_categoria) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    const categoriaExistente = await prisma.categoriaDeTransacao.findUnique({
      where: { nome_da_categoria: nome_da_categoria },
    });

    if (categoriaExistente) {
      return NextResponse.json(
        { error: "Categoria já existe" },
        { status: 400 }
      );
    }

    const novaCategoria = await prisma.categoriaDeTransacao.create({
      data: {
        nome_da_categoria,
        criado_em: new Date(),
      },
    });

    return NextResponse.json(novaCategoria, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/categorias:
 *   get:
 *     summary: Lista todas as categorias
 *     tags: [Categorias]
 *     description: Obtém todas as categorias do banco de dados.
 *     responses:
 *       200:
 *         description: Lista de categorias retornada com sucesso
 *       500:
 *         description: Erro ao buscar categorias
 */
export async function GET() {
  try {
    const categorias = await prisma.categoriaDeTransacao.findMany();
    return NextResponse.json(categorias, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar categorias" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/categorias?id={id}:
 *   put:
 *     summary: Atualiza uma categoria
 *     tags: [Categorias]
 *     description: Atualiza as informações de uma categoria específica.
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         description: ID da categoria a ser atualizada
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome_da_categoria:
 *                 type: string
 *                 description: Nome da categoria
 *                 example: "Renda"
 *     responses:
 *       200:
 *         description: Categoria atualizada com sucesso
 *       400:
 *         description: ID da categoria não fornecido ou nome já em uso
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro ao atualizar categoria
 */
export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID da categoria não fornecido" },
      { status: 400 }
    );
  }

  try {
    const { nome_da_categoria } = await request.json();

    const categoriaExistente = await prisma.categoriaDeTransacao.findUnique({
      where: { nome_da_categoria },
    });

    if (categoriaExistente && categoriaExistente.id !== Number(id)) {
      return NextResponse.json(
        { error: "Nome da categoria já em uso" },
        { status: 400 }
      );
    }

    const categoriaAtualizada = await prisma.categoriaDeTransacao.update({
      where: { id: Number(id) },
      data: { nome_da_categoria },
    });

    return NextResponse.json(categoriaAtualizada, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar categoria" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/categorias?id={id}:
 *   delete:
 *     summary: Remove uma categoria
 *     tags: [Categorias]
 *     description: Remove uma categoria específica do banco de dados.
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         description: ID da categoria a ser removida
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Categoria removida com sucesso
 *       400:
 *         description: ID da categoria não fornecido
 *       500:
 *         description: Erro ao remover categoria
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID da categoria não fornecido" },
      { status: 400 }
    );
  }

  try {
    await prisma.categoriaDeTransacao.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json(
      { message: "Categoria removida com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao remover categoria" },
      { status: 500 }
    );
  }
}

