import BD from './db.js'; // importa a conexão criada no seu arquivo principal

try {
  const resultado = await BD.query('SELECT NOW()');
  console.log('Conexão bem-sucedida!');
} catch (erro) {
  console.error('Erro ao conectar ao banco de dados:', erro.message);
} finally {
  await BD.end();
}
