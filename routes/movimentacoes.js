import express from 'express';
import BD from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // parâmetros
    const busca = (req.query.busca || '').trim();
    const ordenar = (req.query.ordenar || 'data_mov').trim();
    const dirRaw = (req.query.dir || 'desc').trim().toLowerCase();
    const dir = dirRaw === 'asc' ? 'ASC' : 'DESC'; // 🔹 corrige a falta do dir
    const pg = Math.max(1, parseInt(req.query.pg || '1', 10));
    const porPag = 12;
    const offset = (pg - 1) * porPag;

    // whitelist para ORDER BY (apenas os campos mantidos)
    const ORDER_MAP = {
      data_mov: 'm.data_mov',
      nome_produto: 'p.nome_produto',
      nome_usuario: 'u.nome'
    };
    const orderCol = ORDER_MAP[ordenar] || ORDER_MAP.data_mov;

    // filtro de busca
    const where = [];
    const params = [];
    if (busca) {
      params.push(`%${busca}%`);
      where.push(`(p.nome_produto ILIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // total para paginação
    const totalSql = `
      SELECT COUNT(*) AS total
      FROM movimentacoes m
      JOIN produtos p  ON p.id_produto = m.id_produto
      LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario
      ${whereSql}
    `;
    const totalRes = await BD.query(totalSql, params);
    const totalReg = Number(totalRes.rows[0]?.total || 0);
    const totalPgs = Math.max(1, Math.ceil(totalReg / porPag));

    // busca paginada
    params.push(porPag);
    params.push(offset);
    const listSql = `
      SELECT 
        m.id_mov, m.id_produto, m.tipo_mov, m.quantidade, m.descricao, 
        m.id_usuario, m.data_mov,
        p.nome_produto,
        u.nome AS nome_usuario
      FROM movimentacoes m
      JOIN produtos p  ON p.id_produto = m.id_produto
      LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario
      ${whereSql}
      ORDER BY ${orderCol} ${dir}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const resultado = await BD.query(listSql, params);

    res.render('movimentacoes/lista', {
      movimentacoes: resultado.rows,
      mensagem: null,
      busca,
      ordenar,
      dir: dir.toLowerCase(),
      pgAtual: pg,
      totalPgs
    });
  } catch (erro) {
    console.error('Erro ao listar movimentações:', erro);
    res.render('movimentacoes/lista', {
      movimentacoes: [],
      mensagem: 'Erro ao listar movimentações.',
      busca: req.query.busca || '',
      ordenar: req.query.ordenar || 'data_mov',
      dir: (req.query.dir || 'desc').toLowerCase(),
      pgAtual: 1,
      totalPgs: 1
    });
  }
});

router.get('/novo', async (req, res) => {
  try {
    const produtos = await BD.query(`
      SELECT id_produto, nome_produto 
      FROM produtos 
      WHERE ativo = true 
      ORDER BY nome_produto
    `);

    res.render('movimentacoes/criar', {
      produtosCadastrados: produtos.rows,
      mensagem: req.query.erro ? decodeURIComponent(req.query.erro) : null
    });
  } catch (erro) {
    console.error('Erro ao carregar formulário:', erro);
    res.render('movimentacoes/novo', {
      produtosCadastrados: [],
      mensagem: 'Erro ao carregar formulário.'
    });
  }
});

router.post('/novo', async (req, res) => {
  try {
    const { id_produto, tipo_mov, quantidade, descricao } = req.body;

    const produtoId = parseInt(id_produto, 10);
    const tipo = String(tipo_mov || '').toUpperCase().trim();
    const qnt = Number.parseFloat(String(quantidade || '').replace(/\./g, '').replace(',', '.'));
    const idUsuario =
      req.session?.user?.id ??
      req.session?.user?.id_usuario ??
      req.session?.usuarioLogado?.id_usuario ??
      req.session?.idUsuario ??
      null;

    if (!produtoId || !['E', 'S'].includes(tipo) || !(qnt > 0) || !idUsuario) {
      return res.redirect('/movimentacoes/novo?erro=' + encodeURIComponent('Dados inválidos.'));
    }

    // 🔹 O trigger no banco atualiza o estoque automaticamente
    await BD.query(
      `INSERT INTO movimentacoes 
         (id_produto, tipo_mov, quantidade, descricao, id_usuario, data_mov)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [produtoId, tipo, qnt, descricao || null, idUsuario]
    );

    res.redirect('/movimentacoes');
  } catch (erro) {
    console.error('Erro ao criar movimentação:', erro);
    res.redirect('/movimentacoes/novo?erro=' + encodeURIComponent(erro.detail || erro.message || 'Erro ao gravar.'));
  }
});

router.get('/:id/editar', async (req, res) => {
  try {
    const { id } = req.params;

    const mov = await BD.query(
      `SELECT m.*, p.nome_produto
         FROM movimentacoes m
         JOIN produtos p ON p.id_produto = m.id_produto
        WHERE m.id_mov = $1`,
      [id]
    );

    if (!mov.rows.length) return res.redirect('/movimentacoes');

    const produtos = await BD.query(`
      SELECT id_produto, nome_produto 
      FROM produtos 
      WHERE ativo = true 
      ORDER BY nome_produto
    `);

    res.render('movimentacoes/editar', {
      mov: mov.rows[0],
      produtosCadastrados: produtos.rows,
      mensagem: req.query.erro ? decodeURIComponent(req.query.erro) : null
    });
  } catch (erro) {
    console.error('Erro ao carregar edição:', erro);
    res.redirect('/movimentacoes?erro=' + encodeURIComponent('Erro ao carregar edição.'));
  }
});

router.post('/:id/editar', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_produto, tipo_mov, quantidade, descricao } = req.body;

    const produtoId = parseInt(id_produto, 10);
    const tipo = String(tipo_mov || '').toUpperCase().trim();
    const qnt = Number.parseFloat(String(quantidade || '').replace(/\./g, '').replace(',', '.'));
    const idUsuario =
      req.session?.user?.id ??
      req.session?.user?.id_usuario ??
      req.session?.usuarioLogado?.id_usuario ??
      req.session?.idUsuario ??
      null;

    if (!id || !produtoId || !['E', 'S'].includes(tipo) || !(qnt > 0) || !idUsuario) {
      return res.redirect(`/movimentacoes/${id}/editar?erro=` + encodeURIComponent('Dados inválidos.'));
    }

    // 🔹 Trigger no BD estorna o registro antigo e aplica o novo
    await BD.query(
      `UPDATE movimentacoes
          SET id_produto=$1, tipo_mov=$2, quantidade=$3, descricao=$4, id_usuario=$5, data_mov=NOW()
        WHERE id_mov=$6`,
      [produtoId, tipo, qnt, descricao || null, idUsuario, id]
    );

    res.redirect('/movimentacoes');
  } catch (erro) {
    console.error('Erro ao editar movimentação:', erro);
    res.redirect(`/movimentacoes/${req.params.id}/editar?erro=` + encodeURIComponent(erro.detail || erro.message || 'Erro ao editar.'));
  }
});

router.post('/:id/deletar', async (req, res) => {
  try {
    const { id } = req.params;

    // 🔹 Trigger no BD estorna a movimentação excluída
    await BD.query(`DELETE FROM movimentacoes WHERE id_mov = $1`, [id]);

    res.redirect('/movimentacoes');
  } catch (erro) {
    console.error('Erro ao excluir movimentação:', erro);
    res.redirect('/movimentacoes?erro=' + encodeURIComponent(erro.detail || erro.message || 'Erro ao excluir.'));
  }
});

export default router;
