# IT Support Ticket System + IT Asset Management

A production-ready IT Support Ticket System with real-time chat, image uploads, notifications, role-based access control, **and a full IT Asset Management (ITAM) module**.

## 🧱 Tech Stack

- **Tech Stack**: React 18, Vite, Tailwind CSS, SQL Server, Node.js, Socket.io
- **Real-time Engine**: Socket.io for chat and live status updates
- **Audio Alerts**: Custom `.m4a` notifications for chat messages
- **UI Architecture**: Standardized Searchable Comboboxes (iOS-stable absolute-layer pattern)
- **Database Architecture**: Foreign-key consistency with auto-creation of missing metadata (Vendors, Locations)
- **Security**: JWT-based RBAC (Manager / IT Staff / Public)

## 👤 User Roles

### 1. Guest (No Login)
- Create tickets with image uploads
- View their ticket via Ticket ID
- Real-time chat with IT staff

### 2. IT Staff
- Login required
- View all tickets with filters
- Chat with users in real-time
- Update ticket status and priority
- Assign tickets to staff
- **ITAM**: View, create, and update assets (limited fields)
- **ITAM**: Assign/return assets, create maintenance records

### 3. Manager
- All IT permissions
- Dashboard with statistics and charts
- View performance metrics
- SLA monitoring
- **ITAM**: Full asset CRUD (including delete)
- **ITAM**: Manage vendors, licenses, inventory
- **ITAM**: Asset dashboard and reporting

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- SQL Server database
- LINE Notify token (optional)
- SMTP email credentials (optional)

### Installation

1. **Clone or extract the project**:
```bash
cd itsupport_system
```

2. **Setup Backend**:
```bash
cd backend
# 1. Create .env from example (then edit with your DB/Email credentials)
cp .env.example .env

# 2. Install dependencies
npm install
npm run init-db

# 3. COMPLETE DATABASE SETUP (ONE COMMAND - Tables, Migrations, Seeds)
node src/config/init-db.js

# 4. Start Server
npm run dev
```

> [!NOTE]
> The \`node src/config/init-db.js\` command now automatically handles ALL migrations (including V2 and ITAM). No manual SQL execution is required!

4. **Setup Frontend** (in a new terminal):
```bash
cd frontend
npm install
npm run dev
```

5. **Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Manager |
| itstaff | it123 | IT Staff |

### Environment Variables

Create `backend/.env` file:

```env
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=1433
DB_NAME=itsupportDB
DB_USER=sa
DB_PASSWORD=xxxxxxx

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# LINE Notify Token (optional - get from https://notify-bot.line.me/)
LINE_NOTIFY_TOKEN=

# Email Configuration (optional - for Gmail use App Password)
EMAIL_HOST=xxxxx@gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:5173
#CLIENT_URL=https://relying-memo-reforms-declaration.trycloudflare.com/
DISCORD_WEBHOOK_URL=
```

## 📁 Project Structure

```
itsupport_system/
├── backend/
│   ├── src/
│   │   ├── config/         # Database config
│   │   ├── controllers/    # Route controllers
│   │   │   ├── assets.js       # Asset CRUD + assignment + maintenance
│   │   │   ├── licenses.js     # Software license management
│   │   │   ├── inventory.js    # Inventory/stock management
│   │   │   ├── tickets.js      # Ticket management
│   │   │   ├── auth.js         # Authentication
│   │   │   ├── chat.js         # Real-time chat
│   │   │   ├── feedback.js     # Customer feedback
│   │   │   ├── knowledgeBase.js # KB articles
│   │   │   └── notifications.js # In-app notifications
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/
│   │   │   ├── index.js        # Ticket/Chat/User models
│   │   │   └── assetModels.js  # All ITAM models
│   │   ├── routes/
│   │   │   ├── assets.js       # /api/assets routes
│   │   │   ├── licenses.js     # /api/licenses routes
│   │   │   ├── inventory.js    # /api/inventory routes
│   │   │   └── ...             # Existing routes
│   │   ├── services/       # Email & LINE Notify
│   │   └── server.js       # Main server file
│   ├── uploads/            # Uploaded images
│   ├── itam_migration.sql  # ITAM database migration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Auth context
│   │   ├── pages/
│   │   │   ├── AssetList.jsx       # Asset registry with filters
│   │   │   ├── AssetDetail.jsx     # Asset detail (tabbed)
│   │   │   ├── AssetDashboard.jsx  # ITAM dashboard & charts
│   │   │   ├── LicenseList.jsx     # License management
│   │   │   ├── InventoryList.jsx   # Inventory/consumables
│   │   │   └── ...                 # Existing pages
│   │   └── App.jsx         # Main app with routes
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Tickets
- `POST /api/tickets` - Create new ticket (public)
- `GET /api/tickets` - List all tickets (protected)
- `GET /api/tickets/search/:id` - Get ticket by ID
- `PATCH /api/tickets/:id` - Update ticket (protected)
- `GET /api/tickets/stats/dashboard` - Get statistics (manager only)

### Chat
- `GET /api/tickets/:id/messages` - Get messages
- `POST /api/tickets/:id/messages` - Send message

### Assets (ITAM) 🆕
- `GET /api/assets` - List all assets (filters: status, category_id, location_id, search)
- `POST /api/assets` - Create asset
- `GET /api/assets/:id` - Get asset detail (includes assignments, maintenance, tickets, logs)
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset (Manager only)
- `POST /api/assets/:id/assign` - Assign asset to user
- `POST /api/assets/:id/return` - Return asset
- `POST /api/assets/:id/maintenance` - Create maintenance record
- `PATCH /api/assets/maintenance/:id` - Update maintenance status
- `GET /api/assets/:id/history` - Get asset audit log
- `GET /api/assets/stats/dashboard` - Asset statistics
- `GET /api/assets/categories` - Asset categories
- `GET /api/assets/categories/:id/subcategories` - Asset subcategories
- `GET /api/assets/vendors` - Vendors list
- `POST /api/assets/vendors` - Create vendor (Manager only)
- `GET /api/assets/locations` - Locations list

### Software Licenses (ITAM) 🆕
- `GET /api/licenses` - List all licenses
- `POST /api/licenses` - Create license
- `GET /api/licenses/:id` - Get license detail with assignments
- `PUT /api/licenses/:id` - Update license
- `DELETE /api/licenses/:id` - Delete license (Manager only)
- `POST /api/licenses/assign` - Assign license (with seat validation)
- `POST /api/licenses/revoke/:id` - Revoke license assignment
- `GET /api/licenses/expiring` - Licenses expiring in 30 days

### Inventory (ITAM) 🆕
- `GET /api/inventory` - List all inventory items
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete item (Manager only)
- `GET /api/inventory/low-stock` - Items below reorder level

## 🌐 Routes

### Public
- `/` - Create ticket form
- `/ticket/:id` - View ticket and chat
- `/knowledge-base` - FAQ articles

### Admin
- `/login` - Staff login
- `/dashboard` - Manager dashboard (tickets)
- `/tickets` - All tickets list
- `/admin/ticket/:id` - Ticket detail (staff)
- `/admin/kb` - Manage KB articles

### ITAM (Protected) 🆕
- `/assets` - Asset registry with filters & search
- `/assets/:id` - Asset detail (tabs: Info, Assignments, Maintenance, Tickets, Audit Log)
- `/assets/dashboard` - ITAM dashboard with charts & alerts
- `/licenses` - Software license management
- `/inventory` - Inventory & consumables

## 🔔 Notification System

### LINE Notify
- Triggers on new ticket creation
- Triggers on new user message
- Requires LINE_NOTIFY_TOKEN

### Email Notifications
- Triggers on new ticket creation
- Triggers on ticket updates
- Requires SMTP configuration

## 📦 Production Deployment

1. **Build the frontend**:
```bash
cd frontend
npm run build
```

2. **Set production environment variables** in backend/.env

3. **Start the backend**:
```bash
cd backend
npm start
```

## 🛠️ Features

### Ticket Support System
- ✅ Create tickets with multiple image uploads
- ✅ Real-time chat with Socket.io
- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ Ticket status and priority management
- ✅ Ticket assignment to staff
- ✅ Dashboard with charts and statistics
- ✅ LINE Notify integration
- ✅ Email notifications
- ✅ Responsive UI with TailwindCSS
- ✅ Image preview and modal
- ✅ **Enterprise V2:** Ticket Categories & Subcategories
- ✅ **Enterprise V2:** Service Level Agreement (SLA) Tracking
- ✅ **Enterprise V2:** Interactive Internal Staff Notes
- ✅ **Enterprise V2:** Detailed Activity & Audit Logs
- ✅ **Enterprise V2:** In-app Notification System
- ✅ **Enterprise V2:** Customer Feedback & Rating System
- ✅ **Enterprise V2:** Knowledge Base System
- ✅ **New:** Detailed Activity Logging (Captures User IP, Browser, Device, OS)
- ✅ **New:** Manual Computer Name / PC Name field (with Auto-fill memory)
- ✅ **New:** "Recent Tickets" list on Home Page for easy tracking

### IT Asset Management (ITAM) 🆕
- ✅ Asset Master Registry (CRUD with auto-generated codes)
- ✅ Asset Categories & Subcategories
- ✅ Asset Assignment (Check-in / Check-out)
- ✅ Asset Transfer & Return tracking
- ✅ Full Asset Audit Log (all actions tracked)
- ✅ Maintenance & Repair tracking with cost
- ✅ Link Assets to Tickets
- ✅ Software License Management (seat-aware)
- ✅ License Assignment & Revocation
- ✅ Over-allocation prevention
- ✅ Inventory & Consumable Stock tracking
- ✅ Low Stock Alerts
- ✅ Vendor Management
- ✅ Multi-location/Branch Support
- ✅ ITAM Dashboard with Charts & KPIs
- ✅ Warranty Expiry Alerts
- ✅ License Expiry Alerts
- ✅ Top Problematic Assets Report
- ✅ Maintenance Cost Summary
- ✅ QR Code generation per asset
- ✅ Role-based Security (Manager full / IT limited)
- ✅ **New:** Standardized Searchable Comboboxes (iOS/Safari Compatible)
- ✅ **New:** Smart "Auto-Learn" (Automatic Vendor/Location creation on-the-fly)
- ✅ **New:** Real-time Audio Alerts for Chat messages (.m4a)
- ✅ **New:** Copy Ticket Link with visual confirmation

## 🗄️ Database Tables

### Existing (Tickets)
- `users`, `tickets`, `ticket_images`, `chat_messages`
- `categories`, `subcategories`
- `ticket_internal_notes`, `ticket_activity_logs`
- `user_notifications`, `ticket_feedback`
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
