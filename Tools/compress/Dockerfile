FROM python:3.11-slim

# ffmpeg does the actual compression (ffprobe comes with it)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./compress .

COPY ./utils ./utils
RUN pip install --no-cache-dir -r ./utils/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python","-u", "compress.py"]