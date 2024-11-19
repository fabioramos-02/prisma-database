import { NextResponse } from "next/server";
import prisma from "../../lib/PrismaClient";

/**
 * @swagger
 * tags:
 *   - name: Perfil de Configuração
 *     description: Operações relacionadas ao perfil de configuração dos usuários
 */

/**
 * @swagger
 * /api/perfil_de_configuracao:
 *   get:
 *     summary: Retorna o perfil de configuração de um usuário
 *     tags: [Perfil de Configuração]
 *     parameters:
 *       - name: usuarioId
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário para buscar o perfil
 *     responses:
 *       200:
 *         description: Perfil de configuração retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usuarioId:
 *                   type: integer
 *                   example: 1
 *                 notificacoesAtivadas:
 *                   type: boolean
 *                   example: true
 *                 moedaPreferida:
 *                   type: string
 *                   example: "BRL"
 *       404:
 *         description: Perfil não encontrado
 *       500:
 *         description: Erro ao buscar perfil de configuração
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get("usuarioId");

    if (!usuarioId) {
      return NextResponse.json(
        { error: "ID do usuário não fornecido" },
        { status: 400 }
      );
    }

    const perfil = await prisma.perfilDeConfiguracao.findUnique({
      where: { usuarioId: Number(usuarioId) },
    });

    if (!perfil) {
      // Resposta personalizada para perfil não encontrado
      return NextResponse.json(
        { error: "Perfil de configuração não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(perfil, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar perfil de configuração:", error);
    return NextResponse.json(
      { error: "Erro ao buscar perfil de configuração" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/perfil_de_configuracao:
 *   post:
 *     summary: Cria um perfil de configuração para um usuário
 *     tags: [Perfil de Configuração]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuarioId:
 *                 type: integer
 *               notificacoesAtivadas:
 *                 type: boolean
 *               moedaPreferida:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil de configuração criado com sucesso
 *       400:
 *         description: O usuário já possui um perfil
 *       500:
 *         description: Erro ao criar o perfil de configuração
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuarioId, notificacoesAtivadas, moedaPreferida } = body;

    // Verifica se o usuário existe no banco de dados
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: "Usuário não encontrado no banco de dados." },
        { status: 400 }
      );
    }

    // Verifica se o usuário já possui um perfil de configuração
    const existingPerfil = await prisma.perfilDeConfiguracao.findUnique({
      where: { usuarioId },
    });

    if (existingPerfil) {
      return NextResponse.json(
        { error: "O usuário já possui um perfil de configuração." },
        { status: 400 }
      );
    }

    const perfil = await prisma.perfilDeConfiguracao.create({
      data: {
        usuarioId,
        notificacoesAtivadas,
        moedaPreferida,
      },
    });

    return NextResponse.json(perfil, { status: 200 });
  } catch (error) {
    console.error("Erro ao criar o perfil de configuração:", error);
    return NextResponse.json(
      { error: "Erro ao criar o perfil de configuração." },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/perfil_de_configuracao:
 *   put:
 *     summary: Atualiza o perfil de configuração de um usuário
 *     tags: [Perfil de Configuração]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuarioId:
 *                 type: integer
 *               notificacoesAtivadas:
 *                 type: boolean
 *               moedaPreferida:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil de configuração atualizado com sucesso
 *       404:
 *         description: Perfil de configuração não encontrado
 *       500:
 *         description: Erro ao atualizar o perfil de configuração
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { usuarioId, notificacoesAtivadas, moedaPreferida } = body;

    const perfil = await prisma.perfilDeConfiguracao.update({
      where: { usuarioId },
      data: {
        notificacoesAtivadas,
        moedaPreferida,
      },
    });

    return NextResponse.json(perfil, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar o perfil de configuração:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar o perfil de configuração." },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/perfil_de_configuracao:
 *   delete:
 *     summary: Remove o perfil de configuração de um usuário
 *     tags: [Perfil de Configuração]
 *     parameters:
 *       - name: usuarioId
 *         in: query
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Perfil de configuração excluído com sucesso
 *       404:
 *         description: Perfil de configuração não encontrado
 *       500:
 *         description: Erro ao excluir o perfil de configuração
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = parseInt(searchParams.get("usuarioId") || "0", 10);

    if (!usuarioId) {
      return NextResponse.json(
        { error: "O parâmetro usuarioId é obrigatório." },
        { status: 400 }
      );
    }

    // Verifica se o perfil de configuração existe
    const perfilExistente = await prisma.perfilDeConfiguracao.findUnique({
      where: { usuarioId },
    });

    if (!perfilExistente) {
      return NextResponse.json(
        { error: "Perfil de configuração não encontrado." },
        { status: 404 }
      );
    }

    // Exclui o perfil de configuração
    await prisma.perfilDeConfiguracao.delete({
      where: { usuarioId },
    });

    return NextResponse.json(
      { message: "Perfil de configuração excluído com sucesso." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao excluir o perfil de configuração:", error);
    return NextResponse.json(
      { error: "Erro ao excluir o perfil de configuração." },
      { status: 500 }
    );
  }
}