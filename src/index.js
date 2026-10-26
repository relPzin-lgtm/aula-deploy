
import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import express from "express";

const app = express();

// Permite a comunicação entre o frontend e a API
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// Verifica se a API está funcionando
app.get("/health", (req, res) => {
  res.json({ status: "Pedro" });
});

// Lista todos os livros
app.get("/api/livros", async (req, res) => {
  try {
    const { results } = await env.DB
      .prepare("SELECT * FROM livros")
      .all();

    res.json(results);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao listar livros" });
  }
});

// Busca um livro pelo ID
app.get("/api/livros/:id", async (req, res) => {
  try {
    const livro = await env.DB
      .prepare("SELECT * FROM livros WHERE id = ?")
      .bind(req.params.id)
      .first();

    if (!livro) {
      return res.status(404).json({ erro: "Livro não encontrado" });
    }

    res.json(livro);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar livro" });
  }
});

// Cadastra um livro
app.post("/api/livros", async (req, res) => {
  try {
    const { titulo, autor, ano } = req.body ?? {};

    if (!titulo?.trim() || !autor?.trim()) {
      return res.status(400).json({
        erro: "Título e autor são obrigatórios"
      });
    }

    const livro = await env.DB
      .prepare(
        "INSERT INTO livros (titulo, autor, ano) VALUES (?, ?, ?) RETURNING *"
      )
      .bind(titulo.trim(), autor.trim(), ano || null)
      .first();

    res.status(201).json(livro);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao cadastrar livro" });
  }
});

// Atualiza um livro
app.put("/api/livros/:id", async (req, res) => {
  try {
    const { titulo, autor, ano } = req.body ?? {};

    if (!titulo?.trim() || !autor?.trim()) {
      return res.status(400).json({
        erro: "Título e autor são obrigatórios"
      });
    }

    const livro = await env.DB
      .prepare(
        "UPDATE livros SET titulo = ?, autor = ?, ano = ? WHERE id = ? RETURNING *"
      )
      .bind(titulo.trim(), autor.trim(), ano || null, req.params.id)
      .first();

    if (!livro) {
      return res.status(404).json({ erro: "Livro não encontrado" });
    }

    res.json(livro);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao atualizar livro" });
  }
});

// Exclui um livro
app.delete("/api/livros/:id", async (req, res) => {
  try {
    const resultado = await env.DB
      .prepare("DELETE FROM livros WHERE id = ?")
      .bind(req.params.id)
      .run();

    if (resultado.meta.changes === 0) {
      return res.status(404).json({ erro: "Livro não encontrado" });
    }

    res.json({ mensagem: "Livro excluído" });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao excluir livro" });
  }
});

// Tratamento de erros
app.use((erro, req, res, next) => {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido" });
  }

  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor" });
});

// Inicialização no Cloudflare Workers
app.listen(3000);

export default httpServerHandler({ port: 3000 });
