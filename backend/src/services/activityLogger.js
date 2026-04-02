import db from '../config/firebase.js';

export const logActivity = async (ticket_id, action_type, description, reqUser, metadata = {}) => {
  try {
    let actorType = 'guest';
    let actorId = null;
    let actorName = 'System/Guest';

    if (reqUser) {
      actorType = reqUser.role || 'staff';
      actorId = reqUser.id;
      actorName = reqUser.full_name || reqUser.username || 'Staff';
    } else if (action_type === 'ticket_created') {
      actorType = 'guest';
      actorName = 'Public User';
    }

    const { device_name, device_model, device_asset_code, browser_info, ip_address, comp_name } = metadata;

    const logData = {
      ticket_id,
      action_type,
      description,
      actor_type: actorType,
      actor_id: actorId,
      actor_name: actorName,
      device_name: device_name || null,
      device_model: device_model || null,
      device_asset_code: device_asset_code || null,
      browser_info: browser_info || null,
      ip_address: ip_address || null,
      comp_name: comp_name || null,
      created_at: new Date()
    };

    await db.collection('ticket_activity_logs').add(logData);
  } catch (error) {
    console.error('Activity Logger Error:', error);
  }
};
