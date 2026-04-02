-- =========================================================================
-- IT Asset Management (ITAM) Module - SQL Server Migration
-- SAFELY HANDLES EXISTING TABLES AND COLUMNS
-- =========================================================================

-- 1. Vendors
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vendors]') AND type in (N'U'))
BEGIN
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
    CREATE INDEX IX_vendors_name ON vendors(name);
END;

-- 2. Locations (Branches / Departments)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[locations]') AND type in (N'U'))
BEGIN
    CREATE TABLE locations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        type NVARCHAR(50) DEFAULT 'branch', -- branch, department, floor, room
        address NVARCHAR(500) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_locations_name ON locations(name);
END;

-- 3. Asset Categories
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asset_categories]') AND type in (N'U'))
BEGIN
    CREATE TABLE asset_categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_asset_categories_name ON asset_categories(name);
END;

-- 4. Asset Subcategories
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asset_subcategories]') AND type in (N'U'))
BEGIN
    CREATE TABLE asset_subcategories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        category_id INT NOT NULL FOREIGN KEY REFERENCES asset_categories(id) ON DELETE CASCADE,
        name NVARCHAR(100) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_asset_subcategories_category ON asset_subcategories(category_id);
END;

-- 5. Assets (Main Registry)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[assets]') AND type in (N'U'))
BEGIN
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
        status NVARCHAR(20) DEFAULT 'Available',  -- Available, In Use, Repair, Lost, Retired
        location_id INT NULL FOREIGN KEY REFERENCES locations(id),
        assigned_to INT NULL FOREIGN KEY REFERENCES users(id),
        description NVARCHAR(MAX) NULL,
        image_url NVARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_assets_code ON assets(asset_code);
    CREATE INDEX IX_assets_status ON assets(status);
    CREATE INDEX IX_assets_category ON assets(category_id);
    CREATE INDEX IX_assets_location ON assets(location_id);
    CREATE INDEX IX_assets_serial ON assets(serial_number);
    CREATE INDEX IX_assets_assigned ON assets(assigned_to);
END;

-- 6. Asset Assignments (Check-in / Check-out)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asset_assignments]') AND type in (N'U'))
BEGIN
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
    CREATE INDEX IX_asset_assignments_asset ON asset_assignments(asset_id);
    CREATE INDEX IX_asset_assignments_user ON asset_assignments(user_id);
    CREATE INDEX IX_asset_assignments_active ON asset_assignments(asset_id, returned_at);
END;

-- 7. Asset Audit Logs
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asset_logs]') AND type in (N'U'))
BEGIN
    CREATE TABLE asset_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        asset_id INT NOT NULL FOREIGN KEY REFERENCES assets(id) ON DELETE CASCADE,
        action_type NVARCHAR(50) NOT NULL, -- created, updated, assigned, returned, maintenance, status_change, location_change, linked_ticket
        description NVARCHAR(MAX) NULL,
        actor_id INT NULL,
        actor_name NVARCHAR(100) NULL,
        actor_role NVARCHAR(20) NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_asset_logs_asset ON asset_logs(asset_id);
    CREATE INDEX IX_asset_logs_action ON asset_logs(action_type);
    CREATE INDEX IX_asset_logs_date ON asset_logs(created_at DESC);
END;

-- 8. Asset Maintenance & Repair
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asset_maintenance]') AND type in (N'U'))
BEGIN
    CREATE TABLE asset_maintenance (
        id INT IDENTITY(1,1) PRIMARY KEY,
        asset_id INT NOT NULL FOREIGN KEY REFERENCES assets(id) ON DELETE CASCADE,
        ticket_id NVARCHAR(50) NULL,
        issue_description NVARCHAR(MAX) NOT NULL,
        vendor_id INT NULL FOREIGN KEY REFERENCES vendors(id),
        cost DECIMAL(12,2) NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        status NVARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
        created_by INT NULL FOREIGN KEY REFERENCES users(id),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_asset_maintenance_asset ON asset_maintenance(asset_id);
    CREATE INDEX IX_asset_maintenance_status ON asset_maintenance(status);
END;

-- 9. Software Licenses
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[software_licenses]') AND type in (N'U'))
BEGIN
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
    CREATE INDEX IX_software_licenses_name ON software_licenses(name);
    CREATE INDEX IX_software_licenses_expiry ON software_licenses(expiry_date);
END;

-- 10. License Assignments
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[license_assignments]') AND type in (N'U'))
BEGIN
    CREATE TABLE license_assignments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        license_id INT NOT NULL FOREIGN KEY REFERENCES software_licenses(id) ON DELETE CASCADE,
        user_name NVARCHAR(200) NULL,
        asset_id INT NULL FOREIGN KEY REFERENCES assets(id),
        assigned_at DATETIME DEFAULT GETDATE(),
        revoked_at DATETIME NULL
    );
    CREATE INDEX IX_license_assignments_license ON license_assignments(license_id);
    CREATE INDEX IX_license_assignments_active ON license_assignments(license_id, revoked_at);
END;

-- 11. Inventory / Stock (Consumables)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[inventory_items]') AND type in (N'U'))
BEGIN
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
    CREATE INDEX IX_inventory_items_name ON inventory_items(name);
    CREATE INDEX IX_inventory_items_qty ON inventory_items(quantity);
END;

-- 12. Link Tickets to Assets: add asset_id column to tickets table
IF COL_LENGTH('dbo.tickets', 'asset_id') IS NULL
BEGIN
    ALTER TABLE tickets ADD asset_id INT NULL;
END;

-- =========================================================================
-- SEED DATA
-- =========================================================================

-- Seed Asset Categories
IF NOT EXISTS (SELECT 1 FROM asset_categories)
BEGIN
    INSERT INTO asset_categories (name) VALUES 
        ('Computer'), ('Monitor'), ('Printer'), ('Network Equipment'),
        ('Phone'), ('Peripheral'), ('Server'), ('Software'), ('Other');
END;

-- Seed Asset Subcategories
IF NOT EXISTS (SELECT 1 FROM asset_subcategories)
BEGIN
    INSERT INTO asset_subcategories (category_id, name) VALUES
        (1, 'Desktop'), (1, 'Laptop'), (1, 'Workstation'),
        (2, 'LCD Monitor'), (2, 'LED Monitor'),
        (3, 'Laser Printer'), (3, 'Inkjet Printer'), (3, 'Multifunction'),
        (4, 'Switch'), (4, 'Router'), (4, 'Access Point'), (4, 'Firewall'),
        (5, 'IP Phone'), (5, 'Mobile Phone'),
        (6, 'Keyboard'), (6, 'Mouse'), (6, 'Headset'), (6, 'Webcam'),
        (7, 'Rack Server'), (7, 'Tower Server'), (7, 'NAS');
END;

-- Seed Vendors
IF NOT EXISTS (SELECT 1 FROM vendors)
BEGIN
    INSERT INTO vendors (name, contact_person, email, phone) VALUES
        ('Dell Technologies', 'Sales Team', 'sales@dell.com', '1-800-999-3355'),
        ('HP Inc.', 'Corporate Sales', 'sales@hp.com', '1-800-474-6836'),
        ('Lenovo', 'Business Sales', 'sales@lenovo.com', '1-855-253-6686'),
        ('Cisco Systems', 'Partner Support', 'support@cisco.com', '1-800-553-6387'),
        ('Microsoft', 'Licensing', 'licensing@microsoft.com', '1-800-642-7676');
END;

-- Seed Locations
IF NOT EXISTS (SELECT 1 FROM locations)
BEGIN
    INSERT INTO locations (name, type) VALUES
        ('Head Office', 'branch'),
        ('Branch A', 'branch'),
        ('Branch B', 'branch'),
        ('IT Department', 'department'),
        ('HR Department', 'department'),
        ('Finance Department', 'department'),
        ('Server Room', 'room'),
        ('Store Room', 'room');
END;

-- 13. Safety: Ensure image_url column exists for existing tables
IF COL_LENGTH('dbo.assets', 'image_url') IS NULL
BEGIN
    ALTER TABLE assets ADD image_url NVARCHAR(500) NULL;
END;

PRINT 'ITAM Migration completed successfully.';
