CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome       VARCHAR(50) NOT NULL,
    usuario    VARCHAR(50) NOT NULL UNIQUE,
    senha      VARCHAR(60) NOT NULL,
    ativo      BOOLEAN DEFAULT TRUE NOT NULL,
    is_admin   BOOLEAN DEFAULT FALSE
);

CREATE TABLE categorias (
    id_categoria   SERIAL PRIMARY KEY,
    nome_categoria VARCHAR(100) NOT NULL,
    ativa          BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE produtos (
    id_produto      SERIAL PRIMARY KEY,
    nome_produto    VARCHAR(100) NOT NULL,
    descricao       TEXT,
    quantidade      INTEGER DEFAULT 0 NOT NULL,
    estoque_minimo  INTEGER DEFAULT 5 NOT NULL,
    valor           NUMERIC(10,2) DEFAULT 0 NOT NULL,
    imagem          VARCHAR(255),
    ativo           BOOLEAN DEFAULT TRUE NOT NULL,
    id_categoria    INTEGER REFERENCES categorias(id_categoria)
                     ON UPDATE CASCADE ON DELETE SET NULL,
    data_cadastro   TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE movimentacoes (
    id_mov       SERIAL PRIMARY KEY,
    id_produto   INTEGER NOT NULL REFERENCES produtos(id_produto)
                  ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_mov     CHAR(1) NOT NULL CHECK (tipo_mov IN ('E','S')),
    quantidade   INTEGER NOT NULL CHECK (quantidade > 0),
    descricao    TEXT,
    id_usuario   INTEGER REFERENCES usuarios(id_usuario)
                  ON UPDATE CASCADE ON DELETE SET NULL,
    data_mov     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE VIEW vw_produtos_categoria AS
SELECT
    p.id_produto,
    p.nome_produto,
    p.valor,
    p.quantidade,
    p.estoque_minimo,
    p.ativo,
    p.imagem,
    p.data_cadastro,
    c.id_categoria,
    c.nome_categoria
FROM produtos p
LEFT JOIN categorias c ON c.id_categoria = p.id_categoria;


CREATE OR REPLACE VIEW vw_estoque_baixo AS
SELECT
    id_produto,
    nome_produto,
    quantidade,
    estoque_minimo
FROM produtos
WHERE ativo = TRUE
  AND quantidade <= estoque_minimo;


CREATE OR REPLACE FUNCTION fn_movimentacoes_atualiza_estoque()
RETURNS TRIGGER AS $$
BEGIN
  -- Entrada (E) → aumenta o estoque
  IF TG_OP = 'INSERT' AND NEW.tipo_mov = 'E' THEN
    UPDATE produtos
      SET quantidade = quantidade + NEW.quantidade
      WHERE id_produto = NEW.id_produto;

  -- Saída (S) → diminui o estoque
  ELSIF TG_OP = 'INSERT' AND NEW.tipo_mov = 'S' THEN
    UPDATE produtos
      SET quantidade = quantidade - NEW.quantidade
      WHERE id_produto = NEW.id_produto;

  -- Atualização (reverte o movimento anterior e aplica o novo)
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverter movimento anterior
    IF OLD.tipo_mov = 'E' THEN
      UPDATE produtos
        SET quantidade = quantidade - OLD.quantidade
        WHERE id_produto = OLD.id_produto;
    ELSE
      UPDATE produtos
        SET quantidade = quantidade + OLD.quantidade
        WHERE id_produto = OLD.id_produto;
    END IF;

    -- Aplicar novo movimento
    IF NEW.tipo_mov = 'E' THEN
      UPDATE produtos
        SET quantidade = quantidade + NEW.quantidade
        WHERE id_produto = NEW.id_produto;
    ELSE
      UPDATE produtos
        SET quantidade = quantidade - NEW.quantidade
        WHERE id_produto = NEW.id_produto;
    END IF;

  -- Exclusão → desfaz o movimento
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.tipo_mov = 'E' THEN
      UPDATE produtos
        SET quantidade = quantidade - OLD.quantidade
        WHERE id_produto = OLD.id_produto;
    ELSE
      UPDATE produtos
        SET quantidade = quantidade + OLD.quantidade
        WHERE id_produto = OLD.id_produto;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_movimentacoes_estoque
AFTER INSERT OR UPDATE OR DELETE ON movimentacoes
FOR EACH ROW
EXECUTE FUNCTION fn_movimentacoes_atualiza_estoque();


-- ==========================================
-- DADOS INICIAIS PARA AQUAPET
-- ==========================================

-- 🏷️ Categorias
INSERT INTO categorias (nome_categoria, ativa) VALUES
  ('Peixes', true),
  ('Plantas', true),
  ('Aquários', true),
  ('Filtragem e Bomba', true),
  ('Alimentos', true),
  ('Acessórios', true);

-- 👤 Usuários
INSERT INTO usuarios (nome, usuario, senha, ativo, is_admin) VALUES
  ('Administrador', 'admin', '123', true, true),
  ('Usuario teste', 'teste', '123456', true, false);

-- 📦 Produtos
INSERT INTO produtos (nome_produto, descricao, quantidade, estoque_minimo, valor, imagem, ativo, id_categoria, data_cadastro) VALUES
  ('Betta Splendens', 'Peixe de água doce, colorido e territorial. Ideal para aquários individuais.', 28, 5, 35.00, '/img/produtos/betta_splendens.png', true, 1, '2025-10-24 08:03:23'),
  ('Tetra Neon', 'Peixe pequeno de cardume, de coloração azul e vermelha intensa.', 0, 10, 8.00, '/img/produtos/tetra_neon.png', true, 1, '2025-10-24 08:03:23'),
  ('Guppy', 'Peixe pequeno e colorido, ideal para aquários comunitários.', 0, 8, 6.50, '/img/produtos/guppy.png', true, 1, '2025-10-24 08:03:23'),
  ('Corydora Paleatus', 'Peixe de fundo pacífico, ajuda a limpar o substrato.', 20, 5, 10.00, '/img/produtos/corydora_paleatus.png', true, 1, '2025-10-24 08:03:23'),
  ('Kinguio Cometa', 'Peixe ornamental para aquários de água fria, resistente e popular.', 0, 5, 18.00, '/img/produtos/kinguio_cometa.png', true, 1, '2025-10-24 08:03:23'),
  ('Anubias Nana', 'Planta de baixa exigência, ideal para aquários plantados.', 10, 5, 25.00, '/img/produtos/anubias_nana.png', true, 2, '2025-10-24 08:03:23'),
  ('Echinodorus Bleheri', 'Planta de crescimento rápido e folhas largas.', 0, 5, 22.00, '/img/produtos/echinodorus_bleheri.png', true, 2, '2025-10-24 08:03:23'),
  ('Cabomba Caroliniana', 'Planta de caule fino, excelente para o fundo do aquário.', 0, 5, 18.00, '/img/produtos/cabomba_caroliniana.png', true, 2, '2025-10-24 08:03:23'),
  ('Musgo de Java', 'Planta aquática versátil usada em troncos e pedras.', 0, 8, 15.00, '/img/produtos/musgo_java.png', true, 2, '2025-10-24 08:03:23'),
  ('Valisneria Spiralis', 'Planta de folhas longas, ideal para o fundo do aquário.', 0, 5, 20.00, '/img/produtos/valisneria_spiralis.png', true, 2, '2025-10-24 08:03:23'),
  ('Aquário 60L', 'Aquário 60x30x35 cm vidro 4mm, ideal para iniciantes.', 0, 2, 320.00, '/img/produtos/aquario_60l.png', true, 3, '2025-10-24 08:03:23'),
  ('Aquário 100L', 'Aquário 80x35x40 cm vidro 6mm, com acabamento lapidado.', 6, 2, 520.00, '/img/produtos/aquario_100l.png', true, 3, '2025-10-24 08:03:23'),
  ('Tampa para Aquário 60L', 'Tampa com suporte para luminária LED.', 0, 2, 85.00, '/img/produtos/tampa_60l.png', true, 3, '2025-10-24 08:03:23'),
  ('Filtro Interno Atman AT-F301', 'Filtro interno de 300 L/h, ideal para aquários até 60L.', 0, 3, 95.00, '/img/produtos/filtro_interno_atman.png', true, 4, '2025-10-24 08:03:23'),
  ('Filtro Externo Hang-On Boyu WF-2015', 'Filtro externo tipo cascata, vazão de 500 L/h.', 0, 3, 180.00, '/img/produtos/filtro_externo_boyu.png', true, 4, '2025-10-24 08:03:23'),
  ('Bomba Submersa Sarlo Better 700', 'Bomba submersa 700 L/h para circulação e oxigenação.', 0, 3, 110.00, '/img/produtos/bomba_submersa.png', true, 4, '2025-10-24 08:03:23'),
  ('Ração em Flocos TetraMin 50g', 'Ração completa para peixes tropicais, em flocos.', 0, 10, 25.00, '/img/produtos/racao_tetra_floco.png', true, 5, '2025-10-24 08:03:23'),
  ('Ração em Tabletes BottomFish 100g', 'Ração para peixes de fundo e cascudos.', 0, 5, 28.00, '/img/produtos/racao_bottomfish.png', true, 5, '2025-10-24 08:03:23'),
  ('Ração Betta Premium 20g', 'Ração extrusada específica para bettas.', 0, 5, 15.00, '/img/produtos/racao_betta.png', true, 5, '2025-10-24 08:03:23'),
  ('Termômetro Digital Boyu', 'Termômetro de precisão com display digital.', 0, 5, 35.00, '/img/produtos/termometro_digital.png', true, 6, '2025-10-24 08:03:23'),
  ('Rede para Peixes 10cm', 'Rede fina e resistente, ideal para capturar peixes pequenos.', 0, 5, 10.00, '/img/produtos/rede_peixes.png', true, 6, '2025-10-24 08:03:23'),
  ('Condicionador Prime 100ml', 'Remove cloro, cloramina e metais pesados da água.', 0, 5, 45.00, '/img/produtos/prime_100ml.png', true, 6, '2025-10-24 08:03:23');

-- 📈 Movimentações (após produtos criados)
INSERT INTO movimentacoes (id_produto, tipo_mov, quantidade, descricao, id_usuario, data_mov) VALUES
  (6, 'E', 10, NULL, 1, '2025-11-04 09:33:32'),
  (12, 'E', 6, NULL, 1, '2025-11-04 09:34:56'),
  (4, 'E', 20, NULL, 1, '2025-11-04 09:35:06'),
  (1, 'E', 30, NULL, 1, '2025-11-04 09:35:30'),
  (1, 'S', 2, NULL, 1, '2025-11-04 09:51:05');





