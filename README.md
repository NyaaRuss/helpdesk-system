# Required
helpdesk-system/
├── backend/          (Django)
├── frontend/         (React)
└── README.md
# Installations
# Create project directory
mkdir helpdesk-system
cd helpdesk-system

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Django and dependencies
pip install django djangorestframework django-cors-headers django-filter channels djangorestframework-simplejwt pillow

# Create Django project
django-admin startproject backend
cd backend

# Create apps
python manage.py startapp users
python manage.py startapp tickets
python manage.py startapp notifications

# Install PostgreSQL (recommended) or use SQLite
pip install psycopg2-binary




Frontend

# Go back to project root
cd ../..
npx create-react-app frontend
cd frontend

# Install dependencies
npm install axios react-router-dom @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-data-grid react-hook-form yup @hookform/resolvers date-fns socket.io-client chart.js react-chartjs-2 notistack




# project structure

frontend/src/
├── api/
│   └── api.js
├── components/
│   ├── Auth/
│   │   ├── Login.js
│   │   ├── Register.js
│   │   └── PrivateRoute.js
│   ├── Layout/
│   │   ├── DashboardLayout.js
│   │   └── Navbar.js
│   ├── Client/
│   │   ├── ClientDashboard.js
│   │   ├── CreateTicket.js
│   │   ├── TicketList.js
│   │   └── TicketDetail.js
│   ├── Admin/
│   │   ├── AdminDashboard.js
│   │   ├── AllTickets.js
│   │   ├── AssignEngineer.js
│   │   └── EngineerManagement.js
│   ├── Engineer/
│   │   ├── EngineerDashboard.js
│   │   ├── MyTickets.js
│   │   └── TicketChat.js
│   └── Common/
│       ├── Loading.js
│       └── ErrorBoundary.js
├── context/
│   └── AuthContext.js
├── utils/
│   └── constants.js
├── App.js
└── index.js


# Migrations and Setup

# Back to backend directory
cd backend

# Create and apply migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser

# Create sample users
python manage.py shell