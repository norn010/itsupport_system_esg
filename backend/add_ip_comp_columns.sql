-- Add IP address and Computer name columns to activity logs
IF COL_LENGTH('dbo.ticket_activity_logs', 'ip_address') IS NULL
BEGIN
    ALTER TABLE ticket_activity_logs ADD ip_address NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.ticket_activity_logs', 'comp_name') IS NULL
BEGIN
    ALTER TABLE ticket_activity_logs ADD comp_name NVARCHAR(255) NULL;
END;
