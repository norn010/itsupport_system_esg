import pool from './database.js';
import bcrypt from 'bcryptjs';

const initDB = async () => {
  try {
    console.log('Starting full database initialization...');

    // 1. All Tables Setup SQL (Consolidated)
    const setupSQL = `
      -- 1. USERS TABLE
      IF OBJECT_ID('users', 'U') IS NULL
      CREATE TABLE users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          username NVARCHAR(50) UNIQUE NOT NULL,
          password NVARCHAR(255) NOT NULL,
          role NVARCHAR(20) NOT NULL CHECK (role IN ('IT', 'MANAGER')),
          email NVARCHAR(100),
          full_name NVARCHAR(100),
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
      );

      -- 2. CATEGORIES & SUBCATEGORIES
      IF OBJECT_ID('categories', 'U') IS NULL
      CREATE TABLE categories (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          is_active BIT DEFAULT 1,
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('subcategories', 'U') IS NULL
      CREATE TABLE subcategories (
          id INT IDENTITY(1,1) PRIMARY KEY,
          category_id INT FOREIGN KEY REFERENCES categories(id) ON DELETE CASCADE,
          name NVARCHAR(100) NOT NULL,
          is_active BIT DEFAULT 1,
          created_at DATETIME DEFAULT GETDATE()
      );

      -- 3. CORE TICKETING TABLES
      IF OBJECT_ID('tickets', 'U') IS NULL
      CREATE TABLE tickets (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket_id NVARCHAR(50) UNIQUE NOT NULL,
          name NVARCHAR(100) NOT NULL,
          department NVARCHAR(100),
          issue_title NVARCHAR(255) NOT NULL,
          description NVARCHAR(MAX),
          priority NVARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
          status NVARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
          assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
          category_id INT NULL FOREIGN KEY REFERENCES categories(id),
          subcategory_id INT NULL FOREIGN KEY REFERENCES subcategories(id),
          due_date DATETIME NULL,
          first_response_at DATETIME NULL,
          sla_status NVARCHAR(20) DEFAULT 'on_time',
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE(),
          resolved_at DATETIME,
          closed_at DATETIME,
          asset_id INT NULL
      );

      -- Add missing columns to tickets if table existed
      IF COL_LENGTH('dbo.tickets', 'category_id') IS NULL ALTER TABLE tickets ADD category_id INT NULL;
      IF COL_LENGTH('dbo.tickets', 'subcategory_id') IS NULL ALTER TABLE tickets ADD subcategory_id INT NULL;
      IF COL_LENGTH('dbo.tickets', 'asset_id') IS NULL ALTER TABLE tickets ADD asset_id INT NULL;
      IF COL_LENGTH('dbo.tickets', 'due_date') IS NULL ALTER TABLE tickets ADD due_date DATETIME NULL;
      IF COL_LENGTH('dbo.tickets', 'sla_status') IS NULL ALTER TABLE tickets ADD sla_status NVARCHAR(20) DEFAULT 'on_time';
      IF COL_LENGTH('dbo.tickets', 'closed_at') IS NULL ALTER TABLE tickets ADD closed_at DATETIME NULL;

      IF OBJECT_ID('ticket_images', 'U') IS NULL
      CREATE TABLE ticket_images (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
          file_path NVARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('chat_messages', 'U') IS NULL
      CREATE TABLE chat_messages (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
          sender_type NVARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'staff')),
          sender_name NVARCHAR(100),
          user_id INT REFERENCES users(id) ON DELETE SET NULL,
          message NVARCHAR(MAX),
          file_path NVARCHAR(MAX),
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('ticket_internal_notes', 'U') IS NULL
      CREATE TABLE ticket_internal_notes (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket_id NVARCHAR(50) NOT NULL,
          note NVARCHAR(MAX) NOT NULL,
          created_by INT FOREIGN KEY REFERENCES users(id), 
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('user_notifications', 'U') IS NULL
      CREATE TABLE user_notifications (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
          type NVARCHAR(50) NOT NULL,
          title NVARCHAR(255) NOT NULL,
          message NVARCHAR(MAX) NOT NULL,
          related_ticket_id NVARCHAR(50) NULL,
          is_read BIT DEFAULT 0,
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('ticket_feedback', 'U') IS NULL
      CREATE TABLE ticket_feedback (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket_id NVARCHAR(50) NOT NULL UNIQUE,
          rating INT CHECK(rating >= 1 AND rating <= 5) NOT NULL,
          comment NVARCHAR(MAX) NULL,
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('knowledge_base_articles', 'U') IS NULL
      CREATE TABLE knowledge_base_articles (
          id INT IDENTITY(1,1) PRIMARY KEY,
          title NVARCHAR(255) NOT NULL,
          slug NVARCHAR(255) NOT NULL UNIQUE,
          content NVARCHAR(MAX) NOT NULL,
          category_id INT NULL FOREIGN KEY REFERENCES categories(id),
          is_published BIT DEFAULT 0,
          created_by INT FOREIGN KEY REFERENCES users(id),
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
      );

      -- 4. ITAM MODULE
      IF OBJECT_ID('vendors', 'U') IS NULL
      CREATE TABLE vendors (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(200) NOT NULL,
          contact_person NVARCHAR(100) NULL,
          email NVARCHAR(200) NULL,
          phone NVARCHAR(50) NULL,
          address NVARCHAR(500) NULL,
          is_active BIT DEFAULT 1,
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('locations', 'U') IS NULL
      CREATE TABLE locations (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(200) NOT NULL,
          type NVARCHAR(50) DEFAULT 'branch',
          address NVARCHAR(500) NULL,
          is_active BIT DEFAULT 1,
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('asset_categories', 'U') IS NULL
      CREATE TABLE asset_categories (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          is_active BIT DEFAULT 1,
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('asset_subcategories', 'U') IS NULL
      CREATE TABLE asset_subcategories (
          id INT IDENTITY(1,1) PRIMARY KEY,
          category_id INT NOT NULL FOREIGN KEY REFERENCES asset_categories(id) ON DELETE CASCADE,
          name NVARCHAR(100) NOT NULL,
          is_active BIT DEFAULT 1,
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('assets', 'U') IS NULL
      CREATE TABLE assets (
          id INT IDENTITY(1,1) PRIMARY KEY,
          asset_code NVARCHAR(50) NOT NULL UNIQUE,
          name NVARCHAR(255) NOT NULL,
          category_id INT NULL FOREIGN KEY REFERENCES asset_categories(id),
          subcategory_id INT NULL FOREIGN KEY REFERENCES asset_subcategories(id),
          brand NVARCHAR(100) NULL,
          model NVARCHAR(100) NULL,
          serial_number NVARCHAR(100) NULL,
          purchase_date DATE NULL,
          warranty_expiry DATE NULL,
          cost DECIMAL(12,2) NULL,
          vendor_id INT NULL FOREIGN KEY REFERENCES vendors(id),
          status NVARCHAR(20) DEFAULT 'Available',
          location_id INT NULL FOREIGN KEY REFERENCES locations(id),
          assigned_to INT NULL FOREIGN KEY REFERENCES users(id),
          description NVARCHAR(MAX) NULL,
          image_url NVARCHAR(500) NULL,
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('asset_assignments', 'U') IS NULL
      CREATE TABLE asset_assignments (
          id INT IDENTITY(1,1) PRIMARY KEY,
          asset_id INT NOT NULL FOREIGN KEY REFERENCES assets(id) ON DELETE CASCADE,
          user_id INT NOT NULL,
          user_name NVARCHAR(200) NOT NULL,
          assigned_at DATETIME DEFAULT GETDATE(),
          returned_at DATETIME NULL,
          assigned_by INT NULL FOREIGN KEY REFERENCES users(id),
          note NVARCHAR(MAX) NULL
      );

      IF OBJECT_ID('asset_logs', 'U') IS NULL
      CREATE TABLE asset_logs (
          id INT IDENTITY(1,1) PRIMARY KEY,
          asset_id INT NOT NULL FOREIGN KEY REFERENCES assets(id) ON DELETE CASCADE,
          action_type NVARCHAR(50) NOT NULL,
          description NVARCHAR(MAX) NULL,
          actor_id INT NULL,
          actor_name NVARCHAR(100) NULL,
          actor_role NVARCHAR(20) NULL,
          created_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('asset_maintenance', 'U') IS NULL
      CREATE TABLE asset_maintenance (
          id INT IDENTITY(1,1) PRIMARY KEY,
          asset_id INT NOT NULL FOREIGN KEY REFERENCES assets(id) ON DELETE CASCADE,
          ticket_id NVARCHAR(50) NULL,
          issue_description NVARCHAR(MAX) NOT NULL,
          vendor_id INT NULL FOREIGN KEY REFERENCES vendors(id),
          cost DECIMAL(12,2) NULL,
          start_date DATE NULL,
          end_date DATE NULL,
          status NVARCHAR(20) DEFAULT 'pending',
          created_by INT NULL FOREIGN KEY REFERENCES users(id),
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('software_licenses', 'U') IS NULL
      CREATE TABLE software_licenses (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          license_key NVARCHAR(500) NULL,
          total_seats INT DEFAULT 1,
          used_seats INT DEFAULT 0,
          expiry_date DATE NULL,
          vendor_id INT NULL FOREIGN KEY REFERENCES vendors(id),
          cost DECIMAL(12,2) NULL,
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
      );

      IF OBJECT_ID('license_assignments', 'U') IS NULL
      CREATE TABLE license_assignments (
          id INT IDENTITY(1,1) PRIMARY KEY,
          license_id INT NOT NULL FOREIGN KEY REFERENCES software_licenses(id) ON DELETE CASCADE,
          user_name NVARCHAR(200) NULL,
          asset_id INT NULL FOREIGN KEY REFERENCES assets(id),
          assigned_at DATETIME DEFAULT GETDATE(),
          revoked_at DATETIME NULL
      );

      IF OBJECT_ID('inventory_items', 'U') IS NULL
      CREATE TABLE inventory_items (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          category NVARCHAR(100) NULL,
          quantity INT DEFAULT 0,
          reorder_level INT DEFAULT 5,
          location_id INT NULL FOREIGN KEY REFERENCES locations(id),
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
      );

      -- 5. ACTIVITY LOG & METADATA
      IF OBJECT_ID('ticket_activity_logs', 'U') IS NULL
      CREATE TABLE ticket_activity_logs (
          id INT IDENTITY(1,1) PRIMARY KEY,
          ticket_id NVARCHAR(50) NOT NULL,
          action_type NVARCHAR(50) NOT NULL,
          description NVARCHAR(MAX),
          actor_type NVARCHAR(20) NOT NULL, 
          actor_id INT NULL, 
          actor_name NVARCHAR(100),
          created_at DATETIME DEFAULT GETDATE()
      );

      -- Add Metadata columns to Activity Log
      IF COL_LENGTH('dbo.ticket_activity_logs', 'device_name') IS NULL ALTER TABLE ticket_activity_logs ADD device_name NVARCHAR(255) NULL;
      IF COL_LENGTH('dbo.ticket_activity_logs', 'device_model') IS NULL ALTER TABLE ticket_activity_logs ADD device_model NVARCHAR(255) NULL;
      IF COL_LENGTH('dbo.ticket_activity_logs', 'device_asset_code') IS NULL ALTER TABLE ticket_activity_logs ADD device_asset_code NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.ticket_activity_logs', 'browser_info') IS NULL ALTER TABLE ticket_activity_logs ADD browser_info NVARCHAR(500) NULL;
      IF COL_LENGTH('dbo.ticket_activity_logs', 'ip_address') IS NULL ALTER TABLE ticket_activity_logs ADD ip_address NVARCHAR(50) NULL;
      IF COL_LENGTH('dbo.ticket_activity_logs', 'comp_name') IS NULL ALTER TABLE ticket_activity_logs ADD comp_name NVARCHAR(255) NULL;

      -- 6. SEED DATA
      IF NOT EXISTS (SELECT 1 FROM categories) INSERT INTO categories (name) VALUES ('Hardware'), ('Software'), ('Network'), ('Printer'), ('Email'), ('User Account'), ('Other');
      IF NOT EXISTS (SELECT 1 FROM asset_categories) INSERT INTO asset_categories (name) VALUES ('Computer'), ('Monitor'), ('Printer'), ('Network Equipment'), ('Phone'), ('Peripheral'), ('Server'), ('Software'), ('Other');
      IF NOT EXISTS (SELECT 1 FROM locations) INSERT INTO locations (name, type) VALUES ('Head Office', 'branch'), ('IT Department', 'department'), ('Server Room', 'room');
    `;

    await pool.query(setupSQL);
    console.log('✅ Base tables and migrations applied');

    // 2. Default users setup with Bcrypt
    const adminHash = bcrypt.hashSync('admin123', 10);
    const itHash = bcrypt.hashSync('it123', 10);

    await pool.query(`
      IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
      BEGIN
        INSERT INTO users (username, password, role, email, full_name)
        VALUES ('admin', $1, 'MANAGER', 'admin@company.com', 'System Administrator')
      END
    `, [adminHash]);

    await pool.query(`
      IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'itstaff')
      BEGIN
        INSERT INTO users (username, password, role, email, full_name)
        VALUES ('itstaff', $1, 'IT', 'it@company.com', 'IT Staff')
      END
    `, [itHash]);

    console.log('✅ Default users initialized');
    console.log('Database system is fully up-to-date');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

initDB().then(() => {
  process.exit(0);
}).catch(err => {
  process.exit(1);
});

export default initDB;
