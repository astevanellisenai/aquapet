import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import BD from './db.js';

import adminRotas from "./routes/admin.js";
import categoriasRotas from "./routes/categorias.js";
import produtosRotas from "./routes/produtos.js";
import usuariosRotas from "./routes/usuarios.js";
import loginRotas from "./routes/login.js";
import movimentacoesRotas from './routes/movimentacoes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', async (req, res) => {
  const catParam = (req.query.cat || '').trim();
  const catId = Number.parseInt(catParam, 10);
  const temCat = Number.isInteger(catId) && catId > 0;

  try {
    // 1) Categorias — tenta com "ativa = true", se falhar, sem filtro
    let categoriasAtivas = [];
    try {
      const r1 = await BD.query(`
        SELECT id_categoria, nome_categoria
        FROM categorias
        WHERE ativa = TRUE
        ORDER BY nome_categoria
      `);
      categoriasAtivas = r1.rows;
    } catch {
      const r1b = await BD.query(`
        SELECT id_categoria, nome_categoria
        FROM categorias
        ORDER BY nome_categoria
      `);
      categoriasAtivas = r1b.rows;
    }

    // 2) Produtos — tenta com "p.ativo = true", se falhar, sem filtro
    let produtosAtivos = [];
    const params = [];
    let where = 'WHERE 1=1';

    if (temCat) {
      params.push(catId);
      where += ` AND p.id_categoria = $${params.length}`;
    }

    try {
      const r2 = await BD.query(
        `
        SELECT
          p.id_produto,
          p.nome_produto,
          p.descricao,
          p.quantidade,
          p.estoque_minimo,
          p.valor,
          p.imagem,
          c.nome_categoria
        FROM produtos p
        INNER JOIN categorias c ON c.id_categoria = p.id_categoria
        ${where} AND p.ativo = TRUE
        ORDER BY p.nome_produto
        LIMIT 24
        `,
        params
      );
      produtosAtivos = r2.rows;
    } catch {
      const r2b = await BD.query(
        `
        SELECT
          p.id_produto,
          p.nome_produto,
          p.descricao,
          p.quantidade,
          p.estoque_minimo,
          p.valor,
          p.imagem,
          c.nome_categoria
        FROM produtos p
        INNER JOIN categorias c ON c.id_categoria = p.id_categoria
        ${where}
        ORDER BY p.nome_produto
        LIMIT 24
        `,
        params
      );
      produtosAtivos = r2b.rows;
    }

    res.render('landing/index', {
      titulo: 'AquaPet — Catálogo de Produtos',
      categoriasAtivas,
      produtosAtivos,
      catSelecionada: temCat ? catId : ''
    });
  } catch (e) {
    console.error('Erro na landing:', e);
    res.render('landing/index', {
      titulo: 'AquaPet — Catálogo de Produtos',
      categoriasAtivas: [],
      produtosAtivos: [],
      catSelecionada: ''
    });
  }
});

app.use(
  session({
    secret: "sesisenai",
    resave: false,
    saveUninitialized: false,
  })
);

const verificarAutenticacao = (req, res, next) => {
  
  if (req.session.user) {

    res.locals.usuario = req.session.user;
    next();
    
  } else {
    res.redirect("/auth/login");
  }
};

const verificarAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.is_admin) {
    next();
  } else {
    res.status(403).render("erro", {
      mensagem: "Acesso negado. Apenas administradores podem acessar esta área.",
    });
  }
};

app.use("/auth", loginRotas);

app.use("/admin", verificarAutenticacao, adminRotas);
app.use("/categorias", verificarAutenticacao, categoriasRotas);
app.use("/produtos", verificarAutenticacao, produtosRotas);
app.use('/movimentacoes', verificarAutenticacao, movimentacoesRotas);
app.use("/usuarios", verificarAutenticacao, verificarAdmin, usuariosRotas);

app.listen(3001, () =>
  console.log("🚀 Servidor rodando em http://localhost:3001")
);
