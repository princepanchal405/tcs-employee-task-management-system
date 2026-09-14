# TCS Employee & Task Management System

A professional, responsive, role-based full-stack web application developed as a 15-day technical project for managing employees, tasks, leave requests, reporting, and basic organizational workflows.

The system provides separate Admin and Employee experiences with JWT authentication, role-based access control, responsive dashboards, REST API integration, PostgreSQL persistence, validation, reporting, CSV export, and responsive UI support.

---

## 1. Project Overview

The **TCS Employee & Task Management System** provides a centralized workspace for:

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
- Protected API endpoints
- Responsive dashboard
- Navigation sidebar
- Dashboard summary cards
- Quick access to major modules
- JWT access-token refresh

### Admin Dashboard

- Total Employees
- Active Employees
- Pending Tasks
- Completed Tasks
- Pending Leave Requests
- Department-wise employee statistics
- Task status statistics
- Leave statistics
- Pending vs Completed task analysis

### Employee Dashboard

- My Total Tasks
- Pending Tasks
- In Progress Tasks
- Completed Tasks
- Pending Leave Requests
- Approved Leave Requests
- Personal task and leave workflows

---

## 3. Employee Management

The Employee Management module provides:

- Add Employee
- Edit Employee
- Delete Employee
- View Employee Profile / Details
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
- Department filtering
- Status filtering
- Pagination
- Delete confirmation
- Loading states
- Empty states
- Validation and error handling

Employee profile/details are presented through the application UI without requiring separate standalone detail pages.

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
- Search
- Filtering
- Sorting
- Task details
- Pagination
- Validation and error handling

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
- Search
- Filtering
- Pagination
- Date-range validation
- Error and success handling

---

## 6. Reports & Analytics

The Reports & Analytics module provides:

- Department-wise Employee Statistics
- Task Status Statistics
- Employee-wise Task Summary
- Leave Statistics
- Pending vs Completed Task analysis
- KPI summary
- Charts and graphs
- Employee search
- Employee ID search
- Department search
- Task status filtering
- Reset filters
- Pagination
- CSV export

Available CSV exports:

- Employee report
- Task report
- Leave report

---

## 7. Validation & Error Handling

The application includes validation and user-friendly error handling for major workflows.

Implemented validations include:

- Required fields
- Email format validation
- Mobile number validation
- Employee ID validation
- Duplicate Employee ID prevention
- Duplicate email handling
- Valid date validation
- Date-range validation
- Due-date validation
- Leave date validation
- Invalid-data handling
- Success messages
- Error messages
- Loading states
- Empty states
- API error handling
- Unauthorized access handling

---

## 8. UI / UX

The application follows a professional corporate-style interface with:

- Clean and modern design
- Consistent typography
- Consistent spacing and alignment
- Responsive layouts
- Desktop compatibility
- Tablet compatibility
- Mobile compatibility
- Clear navigation
- Consistent buttons and form controls
- Professional data tables
- Loading indicators
- Empty states
- Error states
- User-friendly alerts and notifications
- Role-based navigation
- Role-based access-aware UI

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
- Fetch API

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

## 10. Architecture

```text
User
  |
  v
Frontend
HTML + CSS + JavaScript + Bootstrap
  |
  | Fetch API
  v
Django REST Framework
  |
  | JWT Authentication
  | Permissions
  v
Django ORM
  |
  v
PostgreSQL