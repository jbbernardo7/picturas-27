"""Sends one compress job to the running compress tool and prints what comes back.

Run it from your machine (needs Python + `pip install pika`), with the stack up:

    docker cp .\\some_video.mp4 picturas-compress_tool-1:/app/images/test/in.mp4
    python test_job.py            # level "medium"
    python test_job.py strong     # light | medium | strong
    docker cp picturas-compress_tool-1:/app/images/test/out.mp4 .\\out.mp4

(create the folder first once:  docker exec picturas-compress_tool-1 mkdir -p /app/images/test)

No Python on your machine? Run it inside the compress container instead (pika is already there):

    docker cp Tools\\compress\\test_job.py picturas-compress_tool-1:/app/test_job.py
    docker exec -e RABBITMQ_HOST=rabbitmq picturas-compress_tool-1 python test_job.py strong
"""
import datetime
import json
import os
import sys
import uuid

import pika

HOST, PORT = os.getenv("RABBITMQ_HOST", "localhost"), 5672
USER, PASSWORD = "user", "password"
IN_PATH = "./images/test/in.mp4"      # paths as seen INSIDE the tool container
OUT_PATH = "./images/test/out.mp4"
TIMEOUT_S = 20 * 60

level = sys.argv[1] if len(sys.argv) > 1 else "medium"

conn = pika.BlockingConnection(
    pika.ConnectionParameters(HOST, PORT, "/", pika.PlainCredentials(USER, PASSWORD))
)
ch = conn.channel()
ch.exchange_declare(exchange="picturas", exchange_type="direct", durable=True)
ch.queue_declare(queue="compress_queue", durable=True)

# Private queue that receives its own copy of everything sent to project_queue
# (the projects service keeps consuming its copies as usual).
result_q = ch.queue_declare(queue="", exclusive=True).method.queue
ch.queue_bind(exchange="picturas", queue=result_q, routing_key="project_queue")

msg_id = f"request-test-{uuid.uuid4()}"
job = {
    "messageId": msg_id,
    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "procedure": "compress",
    "parameters": {"inputImageURI": IN_PATH, "outputImageURI": OUT_PATH, "level": level},
}
ch.basic_publish(exchange="", routing_key="compress_queue", body=json.dumps(job))
print(f"sent {msg_id} (level={level}), waiting for the result...")

for method, props, body in ch.consume(result_q, auto_ack=True, inactivity_timeout=TIMEOUT_S):
    if method is None:
        print("timed out waiting for the tool")
        break
    reply = json.loads(body)
    if reply.get("correlationId") != msg_id:
        continue  # someone else's message
    print(json.dumps(reply, indent=2))
    break

conn.close()