# TCS Employee & Task Management System

A professional, responsive, role-based web application developed as a 15-day technical project for managing employees, tasks, leave requests, and basic organizational activities.

The system provides separate Admin and Employee experiences with secure authentication, role-based access, responsive dashboards, workflow management, reporting, validation, and REST API integration.

---

## 1. Project Overview

The **TCS Employee & Task Management System** is designed to provide a centralized workspace for:

- Employee information management
- Task creation and assignment
- Task status tracking
- Employee leave applications
- Leave approval and rejection workflow
- Dashboard statistics
- Reports and analytics
- CSV data export

The application supports two primary roles:

- **Administrator**
- **Employee**

Each role receives access only to the functionality relevant to that role.

---

## 2. Core Features

### Authentication & Dashboard

- Professional login interface
- JWT-based authentication
- Role-based Admin / Employee access
- Responsive dashboard
- Navigation sidebar
- Dashboard summary cards
- Quick access to major modules
- Automatic JWT access-token refresh

### Dashboard Statistics

#### Admin Dashboard

- Total Employees
- Active Employees
- Pending Tasks
- Completed Tasks
- Pending Leave Requests

#### Employee Dashboard

- My Total Tasks
- Pending Tasks
- In Progress Tasks
- Completed Tasks
- Pending Leave Requests
- Approved Leave Requests

---

## 3. Employee Management

The Employee Management module provides:

- Add Employee
- Edit Employee
- Delete Employee
- View Employee Profile
- Employee ID management
- Employee Name
- Email
- Mobile Number
- Department
- Designation
- Location
- Joining Date
- Employment Status
- Employee search
- Department-wise filtering
- Status filtering
- Employee details view
- Pagination

---

## 4. Task Management

The Task Management module provides:

- Create Task
- Assign Task to Employee
- Task Title
- Task Description
- Priority management
  - Low
  - Medium
  - High
- Due Date management
- Task Status
  - Pending
  - In Progress
  - Completed
- Employee-wise task listing
- Employee task status updates
- Search functionality
- Filtering
- Sorting
- Task details view
- Pagination

---

## 5. Leave Management

The Leave Management module provides:

- Employee leave application
- Leave Type
  - Casual
  - Sick
  - Earned
  - Other
- From Date
- To Date
- Reason for Leave
- Leave history
- Leave status tracking
- Admin approval
- Admin rejection
- Approval / rejection remarks
- Employee-wise leave records
- Search and filtering
- Pagination

---

## 6. Reports & Analytics

The Reports & Analytics module provides:

- Department-wise Employee Statistics
- Task Status Statistics
- Employee-wise Task Summary
- Leave Statistics
- Pending vs Completed Task analysis
- Dashboard KPI statistics
- Charts and graphs
- Search and filtering
- Pagination
- CSV export

---

## 7. Validation & Error Handling

The application includes validation and user-friendly error handling for major workflows.

Implemented validations include:

- Required fields
- Email format validation
- Mobile number validation
- Employee ID validation
- Duplicate Employee ID prevention
- Valid date validation
- Date range validation
- Due-date validation
- Leave date validation
- Appropriate success messages
- Appropriate error messages
- Empty states
- Loading states
- Error states
- Invalid-data handling

---

## 8. UI / UX

The application follows a professional corporate-style interface with:

- Clean and modern design
- Consistent typography
- Consistent spacing and alignment
- Responsive layouts
- Desktop compatibility
- Mobile compatibility
- Clear navigation
- Consistent buttons and form controls
- Professional data tables
- Loading indicators
- Empty states
- Error states
- User-friendly alerts and notifications
- Role-based user menus

The interface uses a custom corporate-style design and does not rely on unauthorized official company branding or assets.

---

## 9. Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript ES6+
- Bootstrap 5
- Bootstrap Icons
- Chart.js

### Backend

- Python
- Django
- Django REST Framework
- SimpleJWT

### Database

- PostgreSQL

### Development Tools

- Git
- GitHub
- Visual Studio Code

---

## 10. Project Structure

```text
TCS_Employee_Task_Management_System/
│
├── backend/
│   ├── accounts/
│   ├── config/
│   ├── employees/
│   ├── leaves/
│   ├── reports/
│   ├── tasks/
│   └── manage.py
│
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   ├── dashboard.html
│   ├── employee-details.html
│   ├── employee-register.html
│   ├── employees.html
│   ├── index.html
│   ├── leaves.html
│   ├── reports.html
│   ├── task-details.html
│   └── tasks.html
│
├── .gitignore
├── .env
├── README.md
├── requirements.txt
├── run_backend.bat
└── run_frontend.bat