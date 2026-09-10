# Task Management — Final

Task Management is part of the consolidated project and is no longer a future-phase placeholder.

## Admin

- Create tasks and assign them to active employees
- Set title, description, priority, due date and status
- View, edit and delete tasks
- Search, employee filter, priority filter, status filter and sorting
- Paginated records

## Employee

- View only tasks assigned to the current employee
- Open task details
- Update only task status

## Reliability improvements

The frontend API layer automatically refreshes an expired access token using the stored refresh token and retries the original request once. This prevents normal JWT expiry from leaving the Task page stuck in a loading/401 state.
