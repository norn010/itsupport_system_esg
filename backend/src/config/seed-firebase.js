import db from './firebase.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    console.log('Starting seed process...');
    
    // 1. Seed Users
    const users = [
      {
        id: 'admin',
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        full_name: 'Administrator',
        role: 'MANAGER',
        email: 'admin@example.com',
        created_at: new Date()
      },
      {
        id: 'it_staff',
        username: 'itstaff',
        password: await bcrypt.hash('it123', 10),
        full_name: 'IT Support Team',
        role: 'IT',
        email: 'it@example.com',
        created_at: new Date()
      }
    ];

    for (const user of users) {
      await db.collection('users').doc(user.id).set(user);
      console.log(`User ${user.username} seeded.`);
    }

    // 2. Seed Categories
    const categories = [
      { name: 'Hardware', id: 'cat1' },
      { name: 'Software', id: 'cat2' },
      { name: 'Network', id: 'cat3' },
      { name: 'CCTV & Voice', id: 'cat4' }
    ];

    for (const cat of categories) {
      await db.collection('categories').doc(cat.id).set({
        name: cat.name,
        is_active: true,
        created_at: new Date()
      });
      console.log(`Category ${cat.name} seeded.`);
    }

    // 2.1 Seed Subcategories
    const subCategories = [
      { id: 'sub1', cat_id: 'cat4', name: 'Request Voice Recording' },
      { id: 'sub2', cat_id: 'cat4', name: 'Request CCTV Footage' },
      { id: 'sub3', cat_id: 'cat2', name: 'Software Installation' }
    ];

    for (const sub of subCategories) {
      await db.collection('subcategories').doc(sub.id).set({
        category_id: sub.id === 'sub3' ? 'cat2' : 'cat4',
        name: sub.name,
        is_active: true,
        created_at: new Date()
      });
      console.log(`Subcategory ${sub.name} seeded.`);
    }

    // 3. Seed Tickets (New structure)
    const tickets = [
      {
        ticket_id: 'TICK-20240101-001',
        name: 'John Doe',
        department: 'Sales',
        issue_title: 'Printer not working',
        description: 'Trying to print but nothing happens',
        priority: 'Medium',
        status: 'Open',
        category_id: 'cat1',
        metadata: { ticket_type: 'general' },
        created_at: new Date()
      },
      {
        ticket_id: 'TICK-20240101-002',
        name: 'Jane Smith',
        department: 'HR',
        issue_title: 'Request Voice Recording - 0123456789',
        description: 'Requesting voice recording for call on 01/01/2026',
        priority: 'High',
        status: 'In Progress',
        category_id: 'cat4',
        metadata: { 
          ticket_type: 'voice_recording',
          special_fields: {
            phone: '0123456789',
            start_time: '2026-01-01T08:00:00.000Z',
            end_time: '2026-01-01T10:00:00.000Z',
            location: 'Main Branch'
          }
        },
        created_at: new Date()
      }
    ];

    for (const ticket of tickets) {
      await db.collection('tickets').doc(ticket.ticket_id).set(ticket);
      console.log(`Ticket ${ticket.ticket_id} seeded.`);
    }

    console.log('Seeding complete! Admin login: admin / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
