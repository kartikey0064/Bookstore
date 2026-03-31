# PageTurn Bookstore — Setup Guide

## Project Structure
```
updated_project/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx              ← App entry point
│   ├── App.jsx               ← Router + auth guards
│   ├── App.css               ← Global design system
│   └── component/
│       ├── Introduction.jsx  ← Landing page
│       ├── Login.jsx         ← Login (role-based redirect)
│       ├── Signup.jsx        ← 3-step signup
│       ├── UserHome.jsx      ← User dashboard
│       ├── AdminHome.jsx     ← Admin dashboard
│       ├── Sidebar.jsx       ← Shared sidebar component
│       ├── StarRating.jsx    ← Reusable star widget
│       └── Toast.jsx         ← Global notifications
└── server/
    ├── app.py
    ├── config.py
    ├── requirements.txt
    ├── .env                  ← Set MONGO_URI here
    └── app/
        ├── routes/           ← Flask blueprints
        └── services/         ← Business logic
```

## Backend Setup
```bash
cd server
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python app.py
```

## Frontend Setup
```bash
# From updated_project root
npm install
npm run dev
```

## Test Accounts
- Admin: register any account, set role=admin in MongoDB
  OR seed via Python: db.users.update_one({email:"admin@test.com"}, {$set:{role:"admin"}})
- User: register normally via /signup (defaults to role=user)

## Routes
| Path     | Access        | Description             |
|----------|---------------|-------------------------|
| /        | Public        | Landing page            |
| /login   | Public        | Login (role redirect)   |
| /signup  | Public        | 3-step registration     |
| /home    | role=user     | User dashboard          |
| /admin   | role=admin    | Admin dashboard         |
