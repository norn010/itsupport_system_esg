import axios from 'axios';

const LINE_NOTIFY_API = 'https://notify-api.line.me/api/notify';
const LINE_TOKEN = process.env.LINE_NOTIFY_TOKEN;

export const sendLineNotification = async (ticket, type = 'created') => {
  try {
    if (!LINE_TOKEN) {
      console.log('LINE Notify token not configured');
      return;
    }

    let message = '';
    
    if (type === 'created') {
      message = `\n🎫 New IT Support Ticket\n━━━━━━━━━━━━━━\n📋 Ticket ID: ${ticket.ticket_id}\n📌 Title: ${ticket.issue_title}\n⚡ Priority: ${ticket.priority}\n👤 From: ${ticket.name}\n🏢 Dept: ${ticket.department || 'N/A'}\n🔗 ${process.env.CLIENT_URL}/ticket/${ticket.ticket_id}`;
    } else if (type === 'message') {
      message = `\n💬 New Message\n━━━━━━━━━━━━━━\n📋 Ticket ID: ${ticket.ticket_id}\n📌 Title: ${ticket.issue_title}\n⚡ Priority: ${ticket.priority}\n🔗 ${process.env.CLIENT_URL}/ticket/${ticket.ticket_id}`;
    }

    await axios.post(
      LINE_NOTIFY_API,
      new URLSearchParams({ message }),
      {
        headers: {
          'Authorization': `Bearer ${LINE_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('LINE notification sent successfully');
  } catch (error) {
    console.error('Error sending LINE notification:', error.message);
  }
};
