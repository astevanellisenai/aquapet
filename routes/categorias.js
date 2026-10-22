import express from 'express';
import BD from '../db.js';

const router = express.Router();

/* helper: normaliza checkbox */
function toFlag(v) {
  if (Array.isArray(v) && v.length) v = v[v.length - 1];
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  if (['1','true','t','on','sim','s','yes','y'].includes(s)) return true;
  if (['0','false','f','off','nao','não','n','no'].includes(s)) return false;
  const n = Number(s);
  return !Number.isNaN(n) ? n !== 0 : false;
}

/* whitelist para ORDER BY */
const ORDER_MAP = {
  nome_categoria: 'c.nome_categoria',
  id_categoria:   'c.id_categoria',
};

/* LISTAR (sem direção) */
router.get('/', async (req, res) => {
  try {
    const busca   = (req.query.busca || '').trim();
    const ordenar = ORDER_MAP[req.query.ordenar] ? req.query.ordenar : 'nome_categoria';

    const pgAtual  = Math.max(1, parseInt(req.query.pg, 10) || 1);
    const pageSize = 12;

    const filtros = [];
    const params  = [];

    if (busca) {
      params.push(`%${busca.toUpperCase()}%`);
      filtros.push('UPPER(c.nome_categoria) LIKE $' + params.length);
    }

    const whereSql = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

    const { rows: cRows } = await BD.query(
      `SELECT COUNT(*)::int AS total FROM categorias c ${whereSql}`, params
    );
    const totalReg = cRows[0]?.total || 0;
    const totalPgs = Math.max(1, Math.ceil(totalReg / pageSize));
    const pgUsado  = Math.min(pgAtual, totalPgs);
    const offset   = (pgUsado - 1) * pageSize;

    const { rows: list } = await BD.query(
      `
      SELECT c.id_categoria, c.nome_categoria, c.ativa
      FROM categorias c
      ${whereSql}
      ORDER BY ${ORDER_MAP[ordenar]} ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, pageSize, offset]
    );

    res.render('categorias/lista', {
      categorias: list,
      mensagem: undefined,
      busca,
      ordenar,
      pgAtual: pgUsado,
      totalPgs,
    });
  } catch (erro) {
    console.error('Erro ao listar categorias:', erro);
    res.render('categorias/lista', {
      categorias: [],
      mensagem: 'Erro ao listar categorias.',
      busca: req.query.busca || '',
      ordenar: req.query.ordenar || 'nome_categoria',
      pgAtual: 1,
      totalPgs: 1,
    });
  }
});

/* NOVO (GET) */
router.get('/novo', (_req, res) => res.render('categorias/criar', { mensagem: null }));

/* NOVO (POST) — grava ativa */
router.post('/novo', async (req, res) => {
  try {
    const nome_categoria = (req.body.nome_categoria || '').trim();
    const ativa = toFlag(req.body.ativa); // <- normaliza

    await BD.query(
      `INSERT INTO categorias (nome_categoria, ativa) VALUES ($1, $2)`,
      [nome_categoria, ativa]
    );

    res.redirect('/categorias');
  } catch (erro) {
    console.error('Erro ao inserir categoria:', erro);
    res.render('categorias/criar', { mensagem: 'Erro ao criar categoria.' });
  }
});

/* EDITAR (GET) */
router.get('/:id/editar', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await BD.query(
      `SELECT id_categoria, nome_categoria, ativa FROM categorias WHERE id_categoria = $1`,
      [id]
    );
    if (!r.rows[0]) return res.redirect('/categorias');
    res.render('categorias/editar', { categoria: r.rows[0] });
  } catch (erro) {
    console.error('Erro ao carregar categoria para edição:', erro);
    res.redirect('/categorias');
  }
});

/* EDITAR (POST) — atualiza ativa */
router.post('/:id/editar', async (req, res) => {
  try {
    const { id } = req.params;
    const nome_categoria = (req.body.nome_categoria || '').trim();
    const ativa = toFlag(req.body.ativa); // <- normaliza

    await BD.query(
      `UPDATE categorias SET nome_categoria = $1, ativa = $2 WHERE id_categoria = $3`,
      [nome_categoria, ativa, id]
    );

    res.redirect('/categorias');
  } catch (erro) {
    console.error('Erro ao atualizar categoria:', erro);
    res.redirect('/categorias');
  }
});

/* DELETAR */
router.post('/:id/deletar', async (req, res) => {
  try {
    await BD.query('DELETE FROM categorias WHERE id_categoria = $1', [req.params.id]);
    res.redirect('/categorias');
  } catch (erro) {
    console.error('Erro ao excluir categoria:', erro);
    res.redirect('/categorias');
  }
});

export default router;
