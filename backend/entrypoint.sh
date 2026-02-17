#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
while ! python -c "
import psycopg2
psycopg2.connect(
    dbname='$POSTGRES_DB',
    user='$POSTGRES_USER',
    password='$POSTGRES_PASSWORD',
    host='$DB_HOST',
    port='$DB_PORT'
)
" 2>/dev/null; do
    echo "PostgreSQL not ready yet — waiting..."
    sleep 2
done

echo "PostgreSQL is ready!"

echo "Running migrations..."
python manage.py migrate --no-input

echo "Starting server..."
exec "$@"
