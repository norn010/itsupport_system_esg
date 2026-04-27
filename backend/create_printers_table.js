import db from './src/config/database.js';

const createPrintersTable = async () => {
  try {
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Printers' and xtype='U')
      CREATE TABLE Printers (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Brand NVARCHAR(255),
        Branch NVARCHAR(255),
        ProductName NVARCHAR(255),
        SerialNumber NVARCHAR(255),
        Ip NVARCHAR(255),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      )
    `);
    console.log("Printers table created or already exists.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createPrintersTable();
