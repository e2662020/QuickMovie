QuickMovie Docker Deployment

Quick start:
  docker compose up -d

The application will be available at http://localhost
First visit will redirect to the setup wizard at /setup

Data is persisted in Docker volumes:
  - quickmovie-data: SQLite database
  - quickmovie-uploads: uploaded files
