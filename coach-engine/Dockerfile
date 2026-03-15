FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV UVICORN_RELOAD=false
ENV STOCKFISH_PATH=/usr/games/stockfish

RUN apt-get update \
    && apt-get install -y --no-install-recommends stockfish build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/coach-engine

COPY coach-engine/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY coach-engine /app/coach-engine

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
