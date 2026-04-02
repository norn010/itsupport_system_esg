import axios from 'axios';

export const sendDiscordNotification = async (ticket, type = 'created', extraText = '', imageUrl = null) => {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    let content = '';
    let color = 3447003; // Blue
    // Determine the base URL for images. 
    // Usually, this should be the public BACKEND URL as images are served from here.
    const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const clientUrl = rawClientUrl.endsWith('/') ? rawClientUrl.slice(0, -1) : rawClientUrl;
    
    const rawBackendUrl = process.env.BACKEND_URL || process.env.API_URL;
    let baseUrl = rawBackendUrl ? rawBackendUrl.replace(/\/$/, '') : clientUrl;

    // Support automatic port mapping for localhost environments
    if (!rawBackendUrl && (clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1'))) {
      baseUrl = clientUrl.replace(':5173', ':5000'); 
    }

    if (type === 'created') {
      content = '🚨 **New Support Ticket Required Attention** 🚨';
      color = 15158332; // Red
    } else if (type === 'message') {
      content = '💬 **New Message on Ticket** 💬';
      color = 3066993; // Green
    } else {
      content = 'ℹ️ **Ticket Update Notification**';
    }

    // Ensure the baseUrl has a protocol
    const ensureProtocol = (url) => {
      if (!url.startsWith('http')) return `https://${url}`;
      return url;
    };
    baseUrl = ensureProtocol(baseUrl);

    const embed = {
      title: `[${ticket.ticket_id}] ${ticket.issue_title || ticket.title || 'Support Ticket'}`,
      description: extraText || ticket.description || 'No description provided.',
      url: `${ensureProtocol(clientUrl)}/admin/ticket/${ticket.ticket_id}`,
      color: color,
      fields: [
        {
          name: 'Reported By',
          value: ticket.name || 'Unknown',
          inline: true
        },
        {
          name: 'Priority',
          value: ticket.priority || 'Medium',
          inline: true
        },
        {
          name: 'Status',
          value: ticket.status || 'Open',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Enterprise IT Support System'
      }
    };

    if (imageUrl) {
      // Ensure the URL is absolute and correctly formatted
      const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${cleanImageUrl}`;
      embed.image = { url: absoluteImageUrl };
      console.log('Sending Discord notification. BaseUrl used:', baseUrl);
      console.log('Final image URL for Discord:', absoluteImageUrl);
    }

    const payload = {
      content,
      embeds: [embed]
    };

    await axios.post(webhookUrl, payload);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Error sending Discord notification:', error.message);
    if (error.response) {
      console.error('Discord Response Error:', error.response.data);
    }
  }
};
