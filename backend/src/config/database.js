import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'it_DB',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    useUTC: false, // Important for matching local system time
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('SQL Server connection failed:', err);
    throw err;
  });

export { sql };
export default {
  query: async (text, values) => {
    const pool = await poolPromise;
    const request = pool.request();
    
    // MSSQL doesn't use $1 syntax, it uses @p1, @p2 etc.
    // However, I will map the values manually if provided, but the better 
    // way in mssql is to use request.input().
    // Since the models use (query, values), I'll do a simple mapping here.
    if (values && values.length > 0) {
      values.forEach((value, index) => {
        request.input(`p${index + 1}`, value);
        // Replace $1, $2 with @p1, @p2 in the query text
        const regex = new RegExp(`\\$${index + 1}(?![0-9])`, 'g');
        text = text.replace(regex, `@p${index + 1}`);
      });
    }
    
    const result = await request.query(text);
    return { 
      rows: result.recordset,
      rowCount: result.rowsAffected[0]
    };
  }
};
