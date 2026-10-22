import pkg from 'pg';
//[pause]
const { Pool } = pkg;
//[pause]
const BD = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'aquapet',
  password: 'admin',
  port: 5432
});
//[pause]
export default BD;
