-- =========================================================================
-- IT Support Ticket System V2 Upgrade Migration (SQL Server)
-- SAFELY HANDLES EXISTING TABLES AND COLUMNS
-- =========================================================================

-- 1. Categories & Subcategories
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[categories]') AND type in (N'U'))
BEGIN
    CREATE TABLE categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[subcategories]') AND type in (N'U'))
BEGIN
    CREATE TABLE subcategories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        category_id INT FOREIGN KEY REFERENCES categories(id) ON DELETE CASCADE,
        name NVARCHAR(100) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- Modify Tickets for Categories & SLA
IF COL_LENGTH('dbo.tickets', 'category_id') IS NULL
BEGIN
    ALTER TABLE tickets ADD category_id INT NULL FOREIGN KEY REFERENCES categories(id);
END;

IF COL_LENGTH('dbo.tickets', 'subcategory_id') IS NULL
BEGIN
    ALTER TABLE tickets ADD subcategory_id INT NULL FOREIGN KEY REFERENCES subcategories(id);
END;

IF COL_LENGTH('dbo.tickets', 'due_date') IS NULL
BEGIN
    ALTER TABLE tickets ADD due_date DATETIME NULL;
END;

IF COL_LENGTH('dbo.tickets', 'first_response_at') IS NULL
BEGIN
    ALTER TABLE tickets ADD first_response_at DATETIME NULL;
END;

IF COL_LENGTH('dbo.tickets', 'sla_status') IS NULL
BEGIN
    ALTER TABLE tickets ADD sla_status NVARCHAR(20) DEFAULT 'on_time'; 
END;

-- Notice: We do not add resolved_at or closed_at if they already exist, avoiding the error!
IF COL_LENGTH('dbo.tickets', 'resolved_at') IS NULL
BEGIN
    ALTER TABLE tickets ADD resolved_at DATETIME NULL;
END;

IF COL_LENGTH('dbo.tickets', 'closed_at') IS NULL
BEGIN
    ALTER TABLE tickets ADD closed_at DATETIME NULL;
END;

-- 2. Internal Notes
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_internal_notes]') AND type in (N'U'))
BEGIN
    CREATE TABLE ticket_internal_notes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id NVARCHAR(50) NOT NULL,
        note NVARCHAR(MAX) NOT NULL,
        created_by INT FOREIGN KEY REFERENCES users(id), 
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- 3. Activity Log
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_activity_logs]') AND type in (N'U'))
BEGIN
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
END;

-- 6. In-app Notifications
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[user_notifications]') AND type in (N'U'))
BEGIN
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
END;

-- 7. Feedback
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ticket_feedback]') AND type in (N'U'))
BEGIN
    CREATE TABLE ticket_feedback (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id NVARCHAR(50) NOT NULL UNIQUE,
        rating INT CHECK(rating >= 1 AND rating <= 5) NOT NULL,
        comment NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- 10. Knowledge Base
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[knowledge_base_articles]') AND type in (N'U'))
BEGIN
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
END;

-- SEED DATA (Only inserted if table is empty)
IF NOT EXISTS (SELECT 1 FROM categories)
BEGIN
    INSERT INTO categories (name) VALUES ('Hardware'), ('Software'), ('Network'), ('Printer'), ('Email'), ('User Account'), ('Other');
END;

IF NOT EXISTS (SELECT 1 FROM subcategories)
BEGIN
    INSERT INTO subcategories (category_id, name) VALUES (1, 'Broken Screen'), (1, 'Keyboard Issue'), (2, 'Installation'), (3, 'No Internet'), (4, 'Out of Ink');
END;
