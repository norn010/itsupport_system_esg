const STORAGE_KEY = 'recent_tickets';
const MAX_RECENT = 5;

export const getRecentTickets = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to load recent tickets from localStorage:', err);
    return [];
  }
};

export const saveRecentTicket = (ticket) => {
  try {
    if (!ticket?.ticket_id) return;

    let tickets = getRecentTickets();
    
    // Remove if already exists to move it to the top
    tickets = tickets.filter(t => t.ticket_id !== ticket.ticket_id);
    
    // Add to the beginning
    tickets.unshift({
      ticket_id: ticket.ticket_id,
      issue_title: ticket.issue_title,
      created_at: ticket.created_at || new Date().toISOString(),
      lastViewed: new Date().toISOString()
    });

    // Limit the number of tickets
    if (tickets.length > MAX_RECENT) {
      tickets = tickets.slice(0, MAX_RECENT);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.error('Failed to save recent ticket to localStorage:', err);
  }
};
