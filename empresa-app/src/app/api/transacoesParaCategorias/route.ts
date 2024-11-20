import prisma from "@/app/lib/PrismaClient";

export async function addCategoriaToTransacao(idTransacao: number, categoriaId: number) {
  try {
    console.log("Adicionando categoria:", { idTransacao, categoriaId });

    const resultado = await prisma.transacaoParaCategoria.create({
      data: {
        transacao: { connect: { id: idTransacao } }, // Nome corrigido para transacao
        categoria: { connect: { id: categoriaId } },
      },
    });

    console.log("Categoria adicionada com sucesso:", resultado);
    return { success: true, message: "Categoria adicionada com sucesso!", resultado };
  } catch (error: unknown) {
    console.error("Erro ao adicionar categoria:", {
      idTransacao,
      categoriaId,
      erro: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return {
      success: false,
      message: `Erro ao adicionar categoria: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
}
