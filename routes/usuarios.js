import express from "express";
import BD from "../db.js";

const router = express.Router();

/* Função utilitária para checkboxes */
function toFlag(v) {
  return v === "1" || v === "on" || v === true;
}

/* 📋 LISTAR (busca + ordenação + paginação — sem direção) */
router.get("/", async (req, res) => {
  try {
    const busca   = (req.query.busca || "").trim();
    const ordenar = (req.query.ordenar || "nome").trim(); // nome|usuario|ativo|is_admin|id
    const pg      = Math.max(1, parseInt(req.query.pg || "1", 10));
    const porPag  = 9;

    // Whitelist p/ ORDER BY
    const ORDER_MAP = {
      id:       "u.id_usuario",
      nome:     "u.nome",
      usuario:  "u.usuario",
      ativo:    "u.ativo",
      is_admin: "u.is_admin",
    };
    const orderBy = ORDER_MAP[ordenar] || ORDER_MAP.nome;

    // WHERE (busca por nome/login)
    const params = [];
    const whereParts = [];
    if (busca) {
      params.push(`%${busca}%`, `%${busca}%`);
      whereParts.push(
        `(u.nome ILIKE $${params.length - 1} OR u.usuario ILIKE $${params.length})`
      );
    }
    const whereSQL = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    // Total p/ paginação
    const { rows: countRows } = await BD.query(
      `SELECT COUNT(*)::int AS total FROM usuarios u ${whereSQL}`,
      params
    );
    const totalReg = countRows[0]?.total || 0;
    const totalPgs = Math.max(1, Math.ceil(totalReg / porPag));
    const pgAtual  = Math.min(pg, totalPgs);
    const offset   = (pgAtual - 1) * porPag;

    // Dados (sempre ASC)
    const { rows: usuarios } = await BD.query(
      `
      SELECT u.id_usuario, u.nome, u.usuario,
             u.ativo AS is_ativo, u.is_admin
      FROM usuarios u
      ${whereSQL}
      ORDER BY ${orderBy} ASC
      LIMIT ${porPag} OFFSET ${offset}
      `,
      params
    );

    res.render("usuarios/lista", {
      titulo: "Lista de Usuários",
      usuarios,
      mensagem: undefined,
      busca,
      ordenar,
      pgAtual,
      totalPgs,
    });
  } catch (erro) {
    console.error("Erro ao listar usuários:", erro);
    res.render("usuarios/lista", {
      titulo: "Lista de Usuários",
      usuarios: [],
      mensagem: "Erro ao listar usuários.",
      busca: req.query.busca || "",
      ordenar: req.query.ordenar || "nome",
      pgAtual: 1,
      totalPgs: 1,
    });
  }
});

/* ➕ NOVO (GET) */
router.get("/novo", (req, res) => {
  res.render("usuarios/criar", {
    titulo: "Novo Usuário",
    mensagem: null,
    erros: {},
    form: { nome: "", usuario: "", senha: "", is_admin: false, is_ativo: true },
  });
});

/* ➕ NOVO (POST) */
router.post("/novo", async (req, res) => {
  try {
    const nome     = (req.body.nome || "").trim();
    const usuario  = (req.body.usuario || "").trim();
    const senha    = (req.body.senha || "").trim() || "123456";
    const is_admin = toFlag(req.body.is_admin);
    const is_ativo = toFlag(req.body.is_ativo);

    const erros = {};
    if (!nome)    erros.nome    = "Informe o nome.";
    if (!usuario) erros.usuario = "Informe o usuário (login).";

    if (!erros.usuario) {
      const dup = await BD.query(
        "SELECT 1 FROM usuarios WHERE usuario = $1 LIMIT 1",
        [usuario]
      );
      if (dup.rowCount > 0) erros.usuario = "Este login já está em uso.";
    }

    if (Object.keys(erros).length > 0) {
      return res.status(400).render("usuarios/criar", {
        titulo: "Novo Usuário",
        mensagem: "Corrija os campos destacados.",
        erros,
        form: { nome, usuario, senha: "", is_admin, is_ativo },
      });
    }

    await BD.query(
      `INSERT INTO usuarios (nome, usuario, senha, is_admin, ativo)
       VALUES ($1, $2, $3, $4, $5)`,
      [nome, usuario, senha, is_admin, is_ativo]
    );

    res.redirect("/usuarios");
  } catch (erro) {
    console.error("Erro ao criar usuário:", erro);
    res.status(500).render("usuarios/criar", {
      titulo: "Novo Usuário",
      mensagem: "Erro ao criar usuário. Tente novamente.",
      erros: {},
      form: {
        nome: req.body.nome || "",
        usuario: req.body.usuario || "",
        senha: "",
        is_admin: toFlag(req.body.is_admin),
        is_ativo: toFlag(req.body.is_ativo),
      },
    });
  }
});

/* ✏️ EDITAR (GET) */
router.get("/:id/editar", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows, rowCount } = await BD.query(
      `SELECT id_usuario, nome, usuario, senha, is_admin, ativo AS is_ativo
       FROM usuarios WHERE id_usuario = $1`,
      [id]
    );

    if (!rowCount) return res.status(404).send("Usuário não encontrado.");

    res.render("usuarios/editar", {
      titulo: "Editar Usuário",
      mensagem: null,
      erros: {},
      usuario: rows[0],
    });
  } catch (erro) {
    console.error("Erro ao abrir edição:", erro);
    res.status(500).send("Erro ao carregar usuário.");
  }
});

/* ✏️ EDITAR (POST) */
router.post("/:id/editar", async (req, res) => {
  try {
    const id       = parseInt(req.params.id, 10);
    const nome     = (req.body.nome || "").trim();
    const usuario  = (req.body.usuario || "").trim();
    const senha    = (req.body.senha || "").trim();
    const is_admin = toFlag(req.body.is_admin);
    const is_ativo = toFlag(req.body.is_ativo);

    if (!nome || !usuario) {
      return res.render("usuarios/editar", {
        titulo: "Editar Usuário",
        mensagem: "Preencha nome e usuário.",
        erros: {},
        usuario: { id_usuario: id, nome, usuario, senha: "", is_admin, is_ativo },
      });
    }

    if (senha) {
      await BD.query(
        `UPDATE usuarios
         SET nome=$1, usuario=$2, senha=$3, is_admin=$4, ativo=$5
         WHERE id_usuario=$6`,
        [nome, usuario, senha, is_admin, is_ativo, id]
      );
    } else {
      await BD.query(
        `UPDATE usuarios
         SET nome=$1, usuario=$2, is_admin=$3, ativo=$4
         WHERE id_usuario=$5`,
        [nome, usuario, is_admin, is_ativo, id]
      );
    }

    res.redirect("/usuarios");
  } catch (erro) {
    console.error("Erro ao editar usuário:", erro);
    res.status(500).send("Erro ao salvar alterações.");
  }
});

/* 🗑️ DELETAR */
router.post("/:id/deletar", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await BD.query("DELETE FROM usuarios WHERE id_usuario=$1", [id]);
    res.redirect("/usuarios");
  } catch (erro) {
    console.error("Erro ao deletar usuário:", erro);
    res.status(500).send("Erro ao excluir usuário.");
  }
});

export default router;
