# Final Submission Checklist

## Before sharing the project

1. Configure the local `.env` file from `.env.example`.
2. Confirm PostgreSQL is running and the configured database is reachable.
3. Run:
   - `python manage.py check`
   - `python manage.py makemigrations --check`
   - `python manage.py test`
4. Start the backend and frontend.
5. Smoke-test:
   - Admin login
   - Employee login
   - Employee CRUD
   - Task create/assign/update
   - Leave apply/approve/reject
   - Reports, charts and CSV export
6. Check browser Console and Network for unexpected errors.
7. Do not include `.env`, `venv`, `db.sqlite3`, caches or passwords in the submission.

Keep the project presentation focused on the implemented functionality, architecture and testing results.
