import nodemailer from 'nodemailer';

// Only create transporter if host is provided to prevent crashes
let transporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export const sendTicketNotification = async (ticket, type = 'created') => {
  try {
    if (!transporter) {
      console.log('Skipping email notification: EMAIL_HOST not configured.');
      return;
    }
    const subject = type === 'created' 
      ? `New IT Support Ticket: ${ticket.ticket_id}`
      : `Ticket Updated: ${ticket.ticket_id}`;

    const html = `
      <h2>${type === 'created' ? 'New Ticket Created' : 'Ticket Updated'}</h2>
      <p><strong>Ticket ID:</strong> ${ticket.ticket_id}</p>
      <p><strong>Title:</strong> ${ticket.issue_title}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
      <p><strong>From:</strong> ${ticket.name} (${ticket.department || 'No Department'})</p>
      <p><strong>Description:</strong> ${ticket.description}</p>
      <p><a href="${process.env.CLIENT_URL}/ticket/${ticket.ticket_id}">View Ticket</a></p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject,
      html,
    });

    console.log('Email notification sent successfully');
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
};

export const sendMessageNotification = async (ticket, message, senderType) => {
  try {
    if (!transporter) return;
    
    if (senderType === 'user') {
      const html = `
        <h2>New Message from User</h2>
        <p><strong>Ticket ID:</strong> ${ticket.ticket_id}</p>
        <p><strong>Title:</strong> ${ticket.issue_title}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><a href="${process.env.CLIENT_URL}/ticket/${ticket.ticket_id}">View Ticket</a></p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `New Message: ${ticket.ticket_id}`,
        html,
      });
    }
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};
