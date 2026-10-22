// routes/admin.js
import express from 'express';
import BD from '../db.js'; // conexão com PostgreSQL (Pool)

const router = express.Router();

// GET /admin/dashboard
router.get('/', async (req, res) => {
  try {
    // 🔹 Consulta 1 – Indicadores principais
    const indicadoresQuery = `
      WITH estoque_atual AS (
        SELECT
          id_produto,
          SUM(CASE WHEN tipo_mov = 'E' THEN quantidade ELSE -quantidade END) AS quantidade
        FROM movimentacoes
        GROUP BY id_produto
      )
      SELECT
        (SELECT COUNT(*) FROM produtos WHERE ativo = TRUE) AS total_produtos_ativos,
        (SELECT COALESCE(SUM(quantidade),0) FROM estoque_atual) AS total_itens_estoque,
        (SELECT COUNT(*) FROM produtos p
            LEFT JOIN estoque_atual e ON e.id_produto = p.id_produto
            WHERE p.ativo = TRUE AND COALESCE(e.quantidade,0) <= COALESCE(p.estoque_minimo,0)
        ) AS itens_baixo_estoque,
        (SELECT COALESCE(SUM(COALESCE(e.quantidade,0) * COALESCE(p.valor,0)),0)
            FROM produtos p
            LEFT JOIN estoque_atual e ON e.id_produto = p.id_produto
            WHERE p.ativo = TRUE
        ) AS valor_total_estoque;
    `;
    const indicadoresRes = await BD.query(indicadoresQuery);
    const indicadores = indicadoresRes.rows[0];

    // 🔹 Consulta 2 – Estoque por categoria (para o gráfico)
    const porCategoriaQuery = `
      WITH estoque_atual AS (
        SELECT
          id_produto,
          SUM(CASE WHEN tipo_mov = 'E' THEN quantidade ELSE -quantidade END) AS quantidade
        FROM movimentacoes
        GROUP BY id_produto
      )
      SELECT
        c.nome_categoria,
        COALESCE(SUM(e.quantidade), 0) AS total_itens
      FROM categorias c
      LEFT JOIN produtos p ON p.id_categoria = c.id_categoria AND p.ativo = TRUE
      LEFT JOIN estoque_atual e ON e.id_produto = p.id_produto
      GROUP BY c.id_categoria, c.nome_categoria
      ORDER BY c.nome_categoria;
    `;
    const porCategoriaRes = await BD.query(porCategoriaQuery);
    const porCategoria = porCategoriaRes.rows;

    // 🔹 Consulta 3 – Itens abaixo do mínimo
    const baixoEstoqueQuery = `
      WITH estoque_atual AS (
        SELECT
          id_produto,
          SUM(CASE WHEN tipo_mov = 'E' THEN quantidade ELSE -quantidade END) AS quantidade
        FROM movimentacoes
        GROUP BY id_produto
      )
      SELECT
        p.id_produto,
        p.nome_produto,
        c.nome_categoria,
        COALESCE(e.quantidade,0) AS quantidade,
        COALESCE(p.estoque_minimo,0) AS estoque_minimo
      FROM produtos p
      INNER JOIN categorias c ON c.id_categoria = p.id_categoria
      LEFT JOIN estoque_atual e ON e.id_produto = p.id_produto
      WHERE p.ativo = TRUE
        AND COALESCE(e.quantidade,0) <= COALESCE(p.estoque_minimo,0)
      ORDER BY quantidade ASC
      LIMIT 10;
    `;
    const baixoEstoqueRes = await BD.query(baixoEstoqueQuery);
    const baixoEstoque = baixoEstoqueRes.rows;

    // 🔹 Renderiza a view com todos os dados
    res.render('admin/dashboard', {
      indicadores,
      porCategoria,
      baixoEstoque,
      mensagem: null
    });

  } catch (erro) {
    console.error('Erro ao carregar o painel:', erro);
    res.render('admin/dashboard', {
      indicadores: {
        total_produtos_ativos: 0,
        total_itens_estoque: 0,
        itens_baixo_estoque: 0,
        valor_total_estoque: 0
      },
      porCategoria: [],
      baixoEstoque: [],
      mensagem: 'Erro ao carregar os dados do painel.'
    });
  }
});

export default router;
