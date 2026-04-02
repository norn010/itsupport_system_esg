import { Ticket, TicketImage, ChatMessage, User } from '../models/index.js';
import { sendTicketNotification, sendMessageNotification } from '../services/email.js';
import { sendLineNotification } from '../services/lineNotify.js';
import { sendDiscordNotification } from '../services/discordNotify.js';
import { logActivity } from '../services/activityLogger.js';
import { createSystemNotification, notifyAllITStaff } from './notifications.js';
import { io } from '../server.js';
import exceljs from 'exceljs';

const generateTicketId = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `TICK-${dateStr}-${random}`;
};

export const createTicket = async (req, res) => {
  try {
    const { name, department, issue_title, description, priority = 'Medium', category_id, subcategory_id, asset_id } = req.body;

    if (!name || !issue_title) {
      return res.status(400).json({ message: 'Name and issue title are required' });
    }

    const due_date = null; // Still passing to model but setting as null as per user requirement to remove it

    const ticket_id = generateTicketId();
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    const ticket = await Ticket.create({
      ticket_id,
      name,
      department,
      issue_title,
      description,
      priority,
      category_id: category_id ? parseInt(category_id) : null,
      subcategory_id: subcategory_id ? parseInt(subcategory_id) : null,
      due_date,
      asset_id: asset_id ? parseInt(asset_id) : null,
      metadata
    });

    // Save images if uploaded
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await TicketImage.create(ticket.id, `/uploads/${file.filename}`);
      }
    }

    // Send notifications
    const firstImageUrl = req.files && req.files.length > 0 ? `/uploads/${req.files[0].filename}` : null;
    await sendTicketNotification(ticket, 'created');
    await sendLineNotification(ticket, 'created');
    await sendDiscordNotification(ticket, 'created', '', firstImageUrl);
    await notifyAllITStaff('new_ticket', 'New Ticket Received', `A new ticket ${ticket.ticket_id} needs attention.`, ticket.ticket_id);

    // Log activity
    metadata.ip_address = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logActivity(ticket.ticket_id, 'ticket_created', 'Ticket created by user', req.user, metadata);

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: {
        ...ticket,
        images: req.files ? req.files.map(f => `/uploads/${f.filename}`) : [],
      },
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTickets = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const tickets = await Ticket.findAll({
      status,
      priority,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByTicketId(id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const images = await TicketImage.findByTicketId(ticket.id);
    const messages = await ChatMessage.findByTicketId(ticket.id);

    res.json({
      ...ticket,
      images: images.map(img => img.file_path),
      messages,
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, priority, category_id, subcategory_id, asset_id } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;
    if (priority) updates.priority = priority;
    
    // Category management (combobox support)
    const { category_name, subcategory_name } = req.body;
    if (category_name !== undefined) {
      if (!category_name) {
        updates.category_id = null;
        updates.subcategory_id = null;
      } else {
        const cat = await Category.findOrCreateByName(category_name);
        updates.category_id = cat.id;
        
        if (subcategory_name !== undefined) {
          if (!subcategory_name) {
            updates.subcategory_id = null;
          } else {
            const sub = await Category.findOrCreateSubcategoryByName(cat.id, subcategory_name);
            updates.subcategory_id = sub.id;
          }
        }
      }
    } else if (category_id !== undefined) {
      updates.category_id = category_id ? parseInt(category_id) : null;
    }

    if (subcategory_name !== undefined && category_name === undefined) {
      if (!subcategory_name) {
        updates.subcategory_id = null;
      } else if (ticket.category_id || updates.category_id) {
        const catId = updates.category_id || ticket.category_id;
        const sub = await Category.findOrCreateSubcategoryByName(catId, subcategory_name);
        updates.subcategory_id = sub.id;
      }
    } else if (subcategory_id !== undefined && category_name === undefined) {
      updates.subcategory_id = subcategory_id ? parseInt(subcategory_id) : null;
    }

    if (asset_id !== undefined) updates.asset_id = asset_id || null;

    if (status && status !== ticket.status) {
      updates.status = status;
      await logActivity(ticket.ticket_id, 'status_changed', `Status changed to ${status}`, req.user);
    }
    if (assigned_to !== undefined && assigned_to !== ticket.assigned_to) {
      updates.assigned_to = assigned_to || null;
      await logActivity(ticket.ticket_id, 'staff_assigned', `Ticket assigned to new staff`, req.user);
      
      // Notify the newly assigned staff
      if (assigned_to) {
        await createSystemNotification(assigned_to, 'ticket_assigned', 'Ticket Assigned', `You have been assigned to ticket ${ticket.ticket_id}`, ticket.ticket_id);
      }
    }
    if (priority && priority !== ticket.priority) {
      updates.priority = priority;
      await logActivity(ticket.ticket_id, 'priority_changed', `Priority changed to ${priority}`, req.user);
    }
    
    if (asset_id !== undefined && asset_id !== ticket.asset_id) {
      const action = asset_id ? 'asset_linked' : 'asset_unlinked';
      const msg = asset_id ? 'Asset linked to ticket' : 'Asset link removed from ticket';
      await logActivity(ticket.ticket_id, action, msg, req.user);
    }

    if (status === 'Resolved' || status === 'Closed') {
      updates.resolved_at = new Date();
    }

    const updatedTicket = await Ticket.update(id, updates);

    // Send notifications
    await sendTicketNotification(updatedTicket, 'updated');

    // Emit real-time update to clients viewing this ticket
    io.to(`ticket_${ticket.id}`).emit('ticket_updated', updatedTicket);

    res.json({
      message: 'Ticket updated successfully',
      ticket: await Ticket.findById(id),
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getITStaff = async (req, res) => {
  try {
    const staff = await User.findAllITStaff();
    res.json(staff);
  } catch (error) {
    console.error('Get IT staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await Ticket.getDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = await Ticket.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const exportTicketsExcel = async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    
    // Pass large limit to get all filtered
    const tickets = await Ticket.findAll({
      status,
      priority,
      search,
      limit: 10000,
      offset: 0,
    });

    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet('Tickets Report');

    sheet.columns = [
      { header: 'Ticket ID', key: 'ticket_id', width: 20 },
      { header: 'Title', key: 'issue_title', width: 30 },
      { header: 'Reporter', key: 'name', width: 25 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Category', key: 'category_name', width: 20 },
      { header: 'Subcategory', key: 'subcategory_name', width: 20 },
      { header: 'Priority', key: 'priority', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assigned To', key: 'assigned_name', width: 25 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Due Date', key: 'due_date', width: 20 }
    ];

    sheet.getRow(1).font = { bold: true };

    tickets.forEach(t => {
      sheet.addRow({
        ...t,
        created_at: new Date(t.created_at).toLocaleString(),
        due_date: t.due_date ? new Date(t.due_date).toLocaleString() : ''
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'tickets-export.xlsx'
    );

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
