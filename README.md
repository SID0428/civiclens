# 🏛️ CivicLens — Smart Geo-Targeted Civic Grievance Redressal System

> **Built for Smart India Hackathon (SIH) 2026**  
> *Seamless Citizen Reporting • High-Accuracy GPS Reverse Geocoding • Pincode-Scoped District Sub-Admin Redressal • State Super-Admin Governance*

---

## 🌟 Key Features

1. **Auto-GPS & Reverse Geocoded Pincode Routing**:
   - Queries hardware GPS and uses OpenStreetMap Nominatim to auto-extract the exact 6-digit postal PIN code and street landmark.
   - Automatically routes complaints to the specific District Sub-Admin assigned to that PIN code.

2. **Dedicated Role-Based Portals**:
   - **Citizen Portal**: Report issues, track live redressal status, and view before/after resolution photos.
   - **District Sub-Admin Portal**: Filtered strictly to assigned district PIN codes and civic departments (PWD, Sanitation, Water, Electricity).
   - **Super Admin Master Console**: Full state visibility, KPI analytics, and dynamic sub-admin registration with PIN code assignment.

3. **Multi-Channel Authentication**:
   - **Google OAuth 2.0**: One-click sign-in for citizens.
   - **Google SMTP (Nodemailer)**: 6-digit OTP email verification for secure citizen signup.
   - **Admin Portals**: Official badge credentials & Master Security Key validation.

4. **Cloud Infrastructure Ready**:
   - **Frontend**: HTML5 + Modern Tailwind CSS + Leaflet Maps $\rightarrow$ **Vercel**
   - **Backend**: Node.js + Express REST API $\rightarrow$ **Render**
   - **Database**: MongoDB Atlas
   - **Media Storage**: Cloudinary CDN

---

## 📁 Project Structure

```
civiclens/
├── public/                       # Frontend (Ready for Vercel Deployment)
│   ├── index.html                # Modern Landing Page
│   ├── user-login.html           # Citizen Login (Google OAuth + Email)
│   ├── user-signup.html          # Citizen Signup with Email OTP
│   ├── admin-login.html          # District Sub-Admin Portal Login
│   ├── superadmin-login.html     # Super Admin Master Control Login
│   ├── report-issue.html         # Geo-tagged Issue Reporting with GPS Map
│   ├── user-dashboard.html       # Citizen Grievance Tracker
│   ├── admin-dashboard.html      # District Officer Pincode Triage
│   ├── superadmin-dashboard.html # State Super-Admin Analytics
│   ├── js/
│   │   ├── api.js                # Render/Local backend API connector
│   │   ├── geo.js                # GPS & OpenStreetMap reverse geocoder
│   │   └── auth.js               # Google OAuth helper
│   └── css/
├── server/                       # Backend (Ready for Render Deployment)
│   ├── server.js                 # Express Entry point & static serving
│   ├── package.json
│   ├── .env.example
│   ├── config/                   # MongoDB, Cloudinary, Google SMTP
│   ├── models/                   # User, Complaint, Department schemas
│   ├── controllers/              # Auth, Complaint, and Admin logic
│   ├── middleware/               # JWT Auth, RBAC, Multer memory storage
│   └── routes/                   # authRoutes, complaintRoutes, adminRoutes
├── vercel.json                   # Vercel SPA routing configuration
└── README.md
```

---

## 🚀 Quick Start (Local Setup)

### 1. Install & Configure Backend
```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` with your credentials:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/civiclens
JWT_SECRET=civiclens_jwt_secret_key_2026
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_digit_google_app_password
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
SUPERADMIN_SECRET_KEY=CIVICLENS_SUPER_ADMIN_MASTER_KEY_2026
```

### 2. Start Backend Server
```bash
npm start
# or npm run dev
```

### 3. Open Frontend
Visit: `http://localhost:5000` or open `public/index.html` in your browser.

---

## 🌐 Cloud Deployment Guide

### Deploying Frontend to Vercel
1. Push this repository to GitHub.
2. In [Vercel Dashboard](https://vercel.com), import your repository.
3. Keep the Root Directory as `./` (the `vercel.json` file handles routing to `/public`).
4. In `public/js/api.js`, update `API_BASE_URL` with your Render backend URL (e.g. `https://civiclens-backend.onrender.com/api`).
5. Click **Deploy**.

### Deploying Backend to Render
1. In [Render Dashboard](https://render.com), create a new **Web Service**.
2. Connect your GitHub repository.
3. Set **Root Directory**: `server`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node server.js`
6. Add Environment Variables from your `.env` file under the **Environment** tab.
7. Click **Create Web Service**.

---

## 🔑 Default Credentials for SIH Demo

| Portal | Email | Password | Role / Jurisdiction |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@civiclens.gov.in` | `SuperAdmin@2026` | Central Governance (All Districts) |
| **District Sub-Admin** | Created via Super Admin | Configured on creation | Assigned Pincodes (e.g., 110001, 110075) |
| **Citizen** | Sign up with Email OTP or Google | Configured on signup | General Public |
