@echo off
cd /d "%~dp0backend"
if not exist venv\Scripts\python.exe (
  echo Creating Python virtual environment...
  python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r ..\requirements.txt
python manage.py migrate
python manage.py check
python manage.py runserver
