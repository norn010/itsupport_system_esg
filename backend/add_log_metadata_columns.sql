-- migration for adding metadata to ticket activity logs
IF COL_LENGTH('dbo.ticket_activity_logs', 'device_name') IS NULL
BEGIN
    ALTER TABLE ticket_activity_logs ADD device_name NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.ticket_activity_logs', 'device_model') IS NULL
BEGIN
    ALTER TABLE ticket_activity_logs ADD device_model NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.ticket_activity_logs', 'device_asset_code') IS NULL
BEGIN
    ALTER TABLE ticket_activity_logs ADD device_asset_code NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.ticket_activity_logs', 'browser_info') IS NULL
BEGIN
    ALTER TABLE ticket_activity_logs ADD browser_info NVARCHAR(500) NULL;
END;
