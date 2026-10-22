import express from "express";
import BD from "../db.js";

const router = express.Router();

// 🔹 Tela de login
router.get("/login", (req, res) => {
  res.render("admin/login", { mensagem: null });
});

// 🔹 Autenticação
router.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  try {
    const result = await BD.query(
      "SELECT * FROM usuarios WHERE usuario = $1 AND senha = $2",
      [usuario, senha]
    );

    if (result.rows.length === 0) {
      return res.render("admin/login", {
        mensagem: "Usuário ou senha incorretos. Tente novamente.",
      });
    }

    const user = result.rows[0];

    // 🔸 Cria sessão com dados do usuário
    req.session.user = {
      id: user.id_usuario,
      nome: user.nome,
      usuario: user.usuario,
      is_admin: user.is_admin,
    };

    res.redirect("/admin");
  } catch (err) {
    console.error("Erro no login:", err);
    res.render("admin/login", {
      mensagem: "Erro ao autenticar. Tente novamente mais tarde.",
    });
  }
});

// 🔹 Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

export default router;
