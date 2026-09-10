# START HERE — TCS Employee & Task Management System

This package contains the consolidated final project for Authentication, Dashboard, Employee Management, Task Management, Leave Management and Reports & Analytics.

## Quick start

Open PowerShell in the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
```

Create the root `.env` from `.env.example` and enter your local PostgreSQL credentials.

Then:

```powershell
python manage.py migrate
python manage.py check
python manage.py seed_demo
python manage.py runserver
```

Open a second PowerShell terminal:

```powershell
cd frontend
python -m http.server 8080
```

Open:

`http://127.0.0.1:8080/index.html`

## Demo credentials

Admin:
`admin@tcs.com` / `Admin@12345`

Employee:
`prince.demo@example.com` / `Employee@12345`

## Main test flow

Admin:
Dashboard → Employees → Tasks → Leaves → Reports & Analytics

Employee:
Dashboard → My Tasks → My Leaves

Final checks:

```powershell
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

The archive intentionally excludes the real `.env`, local database, virtual environment and cache files.
