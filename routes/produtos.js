import express from 'express';
import BD from '../db.js';

const router = express.Router();

// ✅ Normaliza checkbox "ativo"
function normalizarAtivo(raw) {
  if (Array.isArray(raw) && raw.length > 0) raw = raw[raw.length - 1];
  if (raw === undefined || raw === null) return false;
  const s = String(raw).trim().toLowerCase();
  if (['1','true','t','on','sim','s','yes','y'].includes(s)) return true;
  if (['0','false','f','off','nao','não','n','no'].includes(s)) return false;
  const n = Number(s);
  if (!Number.isNaN(n)) return n !== 0;
  return false;
}

// ✅ Normaliza o campo de imagem vindo do form (string -> string | null)
function normalizarImagem(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

// Whitelist de ordenação
const ORDER_MAP = {
  nome_produto:   'p.nome_produto',
  valor:          'p.valor',
  quantidade:     'p.quantidade',
  id_produto:     'p.id_produto',
  categoria_nome: 'c.nome_categoria',
};

// LISTAR PRODUTOS
router.get('/', async (req, res) => {
  try {
    const busca   = (req.query.busca || '').trim();
    const ordenar = ORDER_MAP[req.query.ordenar] ? req.query.ordenar : 'nome_produto';

    const pgAtual  = Math.max(1, parseInt(req.query.pg, 10) || 1);
    const pageSize = 9;

    const filtros = [];
    const params  = [];

    if (busca) {
      const like = `%${busca.toUpperCase()}%`;
      params.push(like, like);
      filtros.push(`(UPPER(p.nome_produto) LIKE $${params.length-1} OR UPPER(c.nome_categoria) LIKE $${params.length})`);
    }

    const whereSql = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

    // total p/ paginação
    const countSql = `
      SELECT COUNT(*) AS total
      FROM produtos p
      INNER JOIN categorias c ON c.id_categoria = p.id_categoria
      ${whereSql}
    `;
    const countRes = await BD.query(countSql, params);
    const totalReg = parseInt(countRes.rows[0]?.total || '0', 10);
    const totalPgs = Math.max(1, Math.ceil(totalReg / pageSize));
    const pgUsado  = Math.min(pgAtual, totalPgs);
    const offset   = (pgUsado - 1) * pageSize;

    // listagem
    const selectSql = `
      SELECT 
        p.id_produto,
        p.nome_produto,
        p.descricao,
        p.quantidade,
        p.estoque_minimo,
        p.valor,
        p.imagem,
        p.ativo,
        c.nome_categoria AS categoria_nome
      FROM produtos p
      INNER JOIN categorias c ON c.id_categoria = p.id_categoria
      ${whereSql}
      ORDER BY ${ORDER_MAP[ordenar]} ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const listRes = await BD.query(selectSql, [...params, pageSize, offset]);

    res.render('produtos/lista', {
      produtos: listRes.rows,
      busca,
      ordenar,
      pgAtual: pgUsado,
      totalPgs
    });
  } catch (erro) {
    console.error('Erro ao listar produtos:', erro);
    res.render('produtos/lista', {
      produtos: [],
      busca: req.query.busca || '',
      ordenar: req.query.ordenar || 'nome_produto',
      pgAtual: 1,
      totalPgs: 1,
      mensagem: 'Erro ao listar produtos.'
    });
  }
});

// FORMULÁRIO DE NOVO PRODUTO
router.get('/novo', async (_req, res) => {
  try {
    const categorias = await BD.query(`
      SELECT id_categoria, nome_categoria 
      FROM categorias 
      WHERE ativa = true 
      ORDER BY nome_categoria
    `);
    res.render('produtos/criar', { categoriasCadastradas: categorias.rows, mensagem: null });
  } catch (erro) {
    console.error('Erro ao carregar categorias:', erro);
    res.render('produtos/criar', { categoriasCadastradas: [], mensagem: 'Erro ao carregar categorias.' });
  }
});

// ✅ INSERIR NOVO PRODUTO (agora grava a imagem vinda do campo texto "imagem")
router.post('/novo', async (req, res) => {
  try {
    const { nome_produto, descricao, estoque_minimo, valor, id_categoria, ativo, imagem } = req.body;

    const estoqueMinNum = Number.parseInt(estoque_minimo, 10) || 0;
    const valorNum      = Number.parseFloat(valor) || 0;
    const categoriaId   = Number.parseInt(id_categoria, 10);
    const ativoBool     = normalizarAtivo(ativo);
    const imagemUrl     = normalizarImagem(imagem); // ← pega "/img/produtos/..." ou "https://..."

    await BD.query(
      `INSERT INTO produtos 
       (nome_produto, descricao, quantidade, estoque_minimo, valor, ativo, id_categoria, imagem, data_cadastro)
       VALUES ($1, $2, 0, $3, $4, $5, $6, $7, NOW())`,
      [nome_produto, descricao ?? null, estoqueMinNum, valorNum, ativoBool, categoriaId, imagemUrl]
    );

    res.redirect('/produtos');
  } catch (erro) {
    console.error('Erro ao inserir produto:', erro);
    try {
      const categorias = await BD.query(`
        SELECT id_categoria, nome_categoria 
        FROM categorias 
        WHERE ativa = true 
        ORDER BY nome_categoria
      `);
      res.render('produtos/criar', { categoriasCadastradas: categorias.rows, mensagem: 'Erro ao criar produto.' });
    } catch {
      res.render('produtos/criar', { categoriasCadastradas: [], mensagem: 'Erro ao criar produto.' });
    }
  }
});

// FORMULÁRIO DE EDIÇÃO
router.get('/:id/editar', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!id) return res.redirect('/produtos');

    const produtoRes = await BD.query(`SELECT * FROM produtos WHERE id_produto = $1`, [id]);
    if (produtoRes.rows.length === 0) return res.redirect('/produtos');
    const produto = produtoRes.rows[0];

    const categoriasRes = await BD.query(`
      SELECT id_categoria, nome_categoria 
      FROM categorias 
      WHERE ativa = true 
      ORDER BY nome_categoria
    `);

    const movRes = await BD.query(`
      SELECT 
        m.id_mov,
        m.data_mov,
        m.tipo_mov,
        m.quantidade,
        m.descricao,
        u.nome AS nome_usuario
      FROM movimentacoes m
      INNER JOIN usuarios u ON u.id_usuario = m.id_usuario
      WHERE m.id_produto = $1
      ORDER BY m.data_mov DESC
    `, [id]);

    res.render('produtos/editar', {
      produto,
      categoriasCadastradas: categoriasRes.rows,
      movimentacoes: movRes.rows
    });

  } catch (erro) {
    console.error('Erro ao carregar produto para edição:', erro);
    res.redirect('/produtos');
  }
});

// ✅ ATUALIZAR PRODUTO (agora atualiza a imagem vinda do campo texto "imagem")
router.post('/:id/editar', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { nome_produto, descricao, estoque_minimo, valor, id_categoria, ativo, imagem } = req.body;

    const estoqueMinNum = Number.parseInt(estoque_minimo, 10) || 0;
    const valorNum      = Number.parseFloat(valor) || 0;
    const categoriaId   = Number.parseInt(id_categoria, 10);
    const ativoBool     = normalizarAtivo(ativo);
    const imagemUrl     = normalizarImagem(imagem); // ← pega o valor do form

    await BD.query(
      `UPDATE produtos
         SET nome_produto=$1, descricao=$2, estoque_minimo=$3, valor=$4,
             ativo=$5, id_categoria=$6, imagem=$7
       WHERE id_produto=$8`,
      [nome_produto, descricao ?? null, estoqueMinNum, valorNum, ativoBool, categoriaId, imagemUrl, id]
    );

    res.redirect('/produtos');
  } catch (erro) {
    console.error('Erro ao atualizar produto:', erro);
    res.redirect('/produtos');
  }
});

// EXCLUIR PRODUTO
router.post('/:id/deletar', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    await BD.query('DELETE FROM produtos WHERE id_produto = $1', [id]);
    res.redirect('/produtos');
  } catch (erro) {
    console.error('Erro ao excluir produto:', erro);
    res.redirect('/produtos');
  }
});

export default router;
