# 🐠 AquaPet

Sistema web para gerenciamento de produtos e estoque de uma loja de aquarismo, desenvolvido com **Node.js**, **Express**, **EJS** e **PostgreSQL**.

O projeto possui uma área pública para exibição dos produtos e uma área administrativa protegida por login, permitindo o gerenciamento de categorias, produtos, usuários e movimentações de estoque.

---

## 📌 Funcionalidades

### 🌐 Área pública

- Catálogo de produtos
- Exibição de produtos ativos
- Filtro de produtos por categoria
- Exibição de nome, descrição, preço e imagem dos produtos

### 🔐 Autenticação

- Login de usuários
- Controle de sessão com `express-session`
- Logout
- Proteção das rotas administrativas
- Controle de acesso para usuários administradores

### 📊 Dashboard administrativo

O painel administrativo apresenta:

- Total de produtos ativos
- Quantidade total de itens em estoque
- Produtos com estoque abaixo do mínimo
- Valor total estimado do estoque
- Estoque agrupado por categoria
- Lista dos produtos com estoque baixo

### 🏷️ Categorias

- Listagem de categorias
- Cadastro
- Edição
- Ativação e desativação
- Exclusão

### 📦 Produtos

- Listagem de produtos
- Cadastro
- Edição
- Exclusão
- Associação com categorias
- Controle de produto ativo/inativo
- Imagem do produto
- Pesquisa por nome ou categoria
- Ordenação
- Paginação
- Histórico de movimentações do produto

### 📈 Movimentações de estoque

- Entrada de produtos
- Saída de produtos
- Histórico de movimentações
- Registro do usuário responsável
- Atualização automática do estoque através de trigger no PostgreSQL

### 👥 Usuários

- Cadastro de usuários
- Edição
- Exclusão
- Ativação e desativação
- Definição de usuário administrador
- Área de usuários protegida para administradores

---

## 🛠️ Tecnologias utilizadas

- Node.js
- Express 5
- EJS
- PostgreSQL
- pg
- express-session
- Multer
- Nodemon
- HTML
- CSS
- JavaScript

---

## 📁 Estrutura do projeto

```text
aquapet/
│
├── public/                 # Arquivos estáticos: CSS, JS e imagens
│
├── routes/                 # Rotas da aplicação
│   ├── admin.js
│   ├── categorias.js
│   ├── login.js
│   ├── movimentacoes.js
│   ├── produtos.js
│   └── usuarios.js
│
├── views/                  # Interfaces EJS
│   ├── admin/
│   ├── categorias/
│   ├── includes/
│   ├── landing/
│   ├── movimentacoes/
│   ├── produtos/
│   └── usuarios/
│
├── app.js                  # Arquivo principal da aplicação
├── db.js                   # Configuração da conexão PostgreSQL
├── aquapet.sql             # Estrutura e dados iniciais do banco
├── testaConexao.js         # Teste de conexão com o banco
├── package.json
└── README.md
```

---

## ⚙️ Pré-requisitos

Antes de executar o projeto, instale:

- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- Git

---

## 🚀 Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/astevanellisenai/aquapet.git
```

Entre na pasta:

```bash
cd aquapet
```

### 2. Instalar as dependências

```bash
npm install
```

Esse comando instalará todas as dependências registradas no `package.json`, incluindo o **Nodemon**.

### 3. Instalar o Nodemon separadamente, se necessário

Caso o Nodemon não tenha sido instalado corretamente ou você queira instalá-lo manualmente no projeto, execute:

```bash
npm install nodemon
```

Opcionalmente, para disponibilizar o Nodemon globalmente no computador:

```bash
npm install -g nodemon
```

O projeto já possui o seguinte script no `package.json`:

```json
"scripts": {
  "start": "nodemon app.js"
}
```

Por isso, depois da instalação das dependências, basta utilizar:

```bash
npm start
```

---

## 🗄️ Configuração do banco de dados

Crie no PostgreSQL um banco chamado:

```text
aquapet
```

Depois execute o arquivo:

```text
aquapet.sql
```

O script cria as tabelas:

```text
usuarios
categorias
produtos
movimentacoes
```

Além disso, cria views, função e trigger responsáveis pelo controle de estoque.

---

## 🔌 Configuração da conexão

A conexão com o PostgreSQL está definida no arquivo:

```text
db.js
```

Configuração utilizada atualmente:

```javascript
const BD = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'aquapet',
  password: 'admin',
  port: 5432
});
```

Caso sua instalação do PostgreSQL possua usuário ou senha diferentes, altere essas informações no arquivo `db.js`.

> Para projetos em produção, recomenda-se utilizar variáveis de ambiente para armazenar dados de conexão e outras informações sensíveis.

---

## ▶️ Executando o projeto

Execute:

```bash
npm start
```

O projeto utiliza **Nodemon**, portanto o servidor será reiniciado automaticamente quando houver alterações no código.

A aplicação ficará disponível em:

```text
http://localhost:3001
```

---

## 🔑 Usuários de teste

O arquivo `aquapet.sql` possui usuários iniciais para testes.

### Administrador

```text
Usuário: admin
Senha: 123
```

### Usuário comum

```text
Usuário: teste
Senha: 123456
```

A página de login pode ser acessada em:

```text
http://localhost:3001/auth/login
```

> As credenciais acima são destinadas somente ao ambiente didático/de desenvolvimento e devem ser alteradas antes de qualquer publicação real do sistema.

---

## 🧭 Principais rotas

| Rota | Descrição |
|---|---|
| `/` | Catálogo público |
| `/auth/login` | Login |
| `/auth/logout` | Logout |
| `/admin` | Dashboard administrativo |
| `/categorias` | Gerenciamento de categorias |
| `/produtos` | Gerenciamento de produtos |
| `/movimentacoes` | Movimentações de estoque |
| `/usuarios` | Gerenciamento de usuários administradores |

---

## 📦 Controle de estoque

O controle de estoque é realizado por meio da tabela `movimentacoes`.

Os tipos de movimentação são:

```text
E = Entrada
S = Saída
```

O PostgreSQL possui uma trigger chamada:

```text
trg_movimentacoes_estoque
```

Essa trigger executa automaticamente a função:

```text
fn_movimentacoes_atualiza_estoque()
```

Assim, sempre que uma movimentação é inserida, alterada ou removida, a quantidade do produto é atualizada automaticamente.

---

## 📊 Banco de dados

Relacionamento principal:

```text
categorias
    │
    └── produtos
            │
            └── movimentacoes
                    │
                    └── usuarios
```

Também são utilizadas as views:

```text
vw_produtos_categoria
vw_estoque_baixo
```

---

## 👨‍💻 Desenvolvimento

Projeto desenvolvido para fins educacionais, aplicando conceitos de:

- Desenvolvimento Web Backend
- Node.js e Express
- Renderização com EJS
- CRUD
- Sessões e autenticação
- PostgreSQL
- Chaves primárias e estrangeiras
- Views
- Functions
- Triggers
- Pesquisa
- Ordenação
- Paginação
- Controle de estoque

---

## 📚 Projeto AquaPet

Este repositório pode ser utilizado como exemplo prático de integração entre uma aplicação web Node.js e um banco de dados PostgreSQL, contemplando desde operações CRUD até regras de negócio implementadas diretamente no banco de dados.
