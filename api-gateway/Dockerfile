# Use the official lightweight Python image.
FROM python:3.11-slim

WORKDIR /app

# Install system deps for psycopg2
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY main.py /app/

# Cloud Run expects the container to listen on PORT
ENV PORT=8080
EXPOSE 8080

# Gunicorn for production, but you can still run `python main.py` locally
CMD ["gunicorn", "main:app", "-b", "0.0.0.0:8080", "-w", "1", "--threads", "2", "--timeout", "60"]

