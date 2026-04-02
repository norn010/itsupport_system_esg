# IT Support Ticket System + IT Asset Management (Firebase Edition)

A production-ready IT Support Ticket System with real-time chat, image uploads, notifications, and role-based access control, **powered by Firebase Firestore and Authentication**. Includes a full IT Asset Management (ITAM) module.

## 🧱 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Socket.io
- **Database**: **Firebase Firestore** (NoSQL)
- **Authentication**: Firebase Authentication (via custom JWT)
- **Real-time Engine**: Socket.io for chat and live status updates
- **Storage**: Local filesystem (uploads/) with Firestore metadata
- **Date Formatting**: Global Thai (พ.ศ.) date formatting logic

## 👤 User Roles

### 1. Guest (No Login)
- Create tickets with image uploads
- **AnyDesk ID Support**: Optionally specify AnyDesk ID for remote help
- View their ticket via Ticket ID or **Scan QR Code**
- Real-time chat with IT staff

### 2. IT Staff / Admin
- Login required (Manage via **Staff User** menu)
- View all tickets with filters & scannable queue
- **AnyDesk Integration**: See AnyDesk ID immediately in Ticket Detail
- Chat with users in real-time
- Update ticket status and priority
- **ITAM**: Full asset registry, license management, and inventory tracking

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Firebase Project with Firestore enabled
- Firebase Service Account Key (`serviceAccountKey.json`)

### Installation

1. **Clone or extract the project**:
```bash
cd itsupport_system_ESG2
```

2. **Setup Backend**:
```bash
cd backend
# 1. Create .env (edit with your Firebase Project ID & JWT Secret)
cp .env.example .env

# 2. Add your Firebase serviceAccountKey.json to the backend/ directory

# 3. Install dependencies
npm install

# 4. Start Server
npm run dev
```

3. **Setup Frontend** (in a new terminal):
```bash
cd frontend
npm install
npm run dev
```

4. **Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Accounts (Current)

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Manager |
| norn | norn123 | IT Staff |

> [!TIP]
> You can now manage IT Staff accounts directly through the **"Staff User"** menu in the Navbar when logged in as an admin!

## 📁 Project Structure

```
itsupport_system/
├── backend/
│   ├── src/
│   │   ├── config/         # Firebase Admin SDK config
│   │   ├── controllers/    # Route controllers (Tickets, Users, Assets, etc.)
│   │   ├── routes/         # Express routes (including /api/users)
│   │   ├── models/         # Firestore model abstraction layer
│   │   └── server.js       # Express + Socket.io entry point
│   ├── serviceAccountKey.json # REQUIRED: Firebase auth file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # UI Components, Navbar, Layout, QR Code
│   │   ├── pages/          # ManageUsers.jsx, CreateTicket.jsx, etc.
│   │   └── contexts/       # Auth & Theme (Dark Mode) Contexts
│   └── package.json
└── README.md
```

## 🛠️ Key Features

### Ticket Support System
- ✅ **New: AnyDesk ID Support** (Optional field for remote assistance)
- ✅ **New: Ticket QR Code** (Scan to open ticket status on mobile)
- ✅ **New: Staff Management UI** (Add/Delete IT staff accounts via web)
- ✅ **New: Standardized Thai Date Format** (Correct พ.ศ. display everywhere)
- ✅ Real-time chat with Socket.io & Audio alerts (.m4a)
- ✅ Multiple image uploads with preview modal
- ✅ In-app notification system
- ✅ Customer feedback & rating system
- ✅ Knowledge Base articles with centralized search

### IT Asset Management (ITAM)
- ✅ Asset Master Registry with Check-in/Check-out
- ✅ Software License Management (seat-aware)
- ✅ Consumable Inventory & Low Stock Alerts
- ✅ Asset Maintenance & Repair history
- ✅ Smart "Auto-Learn" for Vendors & Locations
- ✅ QR Code generation per asset record

## 🔔 Notifications
- **Discord Integration**: Automated notifications for new tickets & updates
- **Timeline Logs**: Full audit trail of every ticket action

## 📝 License

MIT License
otifications`, `ticket_feedback`
- `knowledge_base_articles`

### ITAM (New) 🆕
- `assets` - Main asset registry
- `asset_categories` - Asset type categories
- `asset_subcategories` - Asset subcategories
- `asset_assignments` - Check-in/out history
- `asset_logs` - Complete audit trail
- `asset_maintenance` - Repair & maintenance records
- `vendors` - Vendor/supplier directory
- `locations` - Branches & departments
- `software_licenses` - License registry
- `license_assignments` - License allocation
- `inventory_items` - Consumable stock

## 📝 License

MIT License
