# TCS Employee & Task Management System

A professional role-based employee, task, leave and reporting application for the 15-day technical project.

## Included modules

- Authentication with JWT and role-based Admin / Employee access
- Responsive Admin and Employee dashboards
- Employee Management: create, edit, delete, view, search, filters and pagination
- Task Management: create, assign, edit, delete, details, priority, due dates, status updates, search, filters, sorting and pagination
- Leave Management: employee applications, history, Admin approval/rejection, remarks, filters and pagination
- Reports & Analytics: live KPI cards, charts, employee-wise task summary and CSV export
- Responsive corporate-style UI using Bootstrap 5, custom CSS and Chart.js
- Automatic access-token refresh when the JWT expires

## Technology

Frontend: HTML5, CSS3, JavaScript ES6+, Bootstrap 5, Bootstrap Icons, Chart.js
Backend: Python, Django 6.1, Django REST Framework, SimpleJWT
Database: PostgreSQL

## Windows setup

From the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
```

Copy the root `.env.example` to `.env` and set your local PostgreSQL credentials.

Then:

```powershell
python manage.py migrate
python manage.py check
python manage.py seed_demo
python manage.py runserver
```

Start the frontend in a second terminal:

```powershell
cd frontend
python -m http.server 8080
```

Open:

`http://127.0.0.1:8080/index.html`

## Demo accounts

Created by `python manage.py seed_demo`:

Admin
- Email: `admin@tcs.com`
- Password: `Admin@12345`

Employee
- Email: `prince.demo@example.com`
- Password: `Employee@12345`

## Verification checklist

Run:

```powershell
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

Expected project baseline:

- Django check: no issues
- Migration check: no changes detected
- Automated API tests: 6 passed

Then perform browser smoke testing for Admin and Employee workflows, including Employees, Tasks, Leaves and Reports.

## Security

Do not commit `.env`, local databases, virtual environments or Python caches. The delivered package contains `.env.example` only.
