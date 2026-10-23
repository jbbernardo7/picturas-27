import time

import pika
from pika.exchange_type import ExchangeType

"""
# Callback example for those who need it
def callback(ch, method, properties, body):
    print(f" [x] Received {body.decode()}")
"""

class Rabbit_MQ:
    def __init__(self, host, port, username, password, retries=30, delay=2):
        self._host = host
        self._port = port
        self._credentials = pika.PlainCredentials(username, password)

        # RabbitMQ can still be starting (or restarting) when a tool starts. Wait for it
        # instead of dying on the first failed attempt, and say so in the log.
        parameters = pika.ConnectionParameters(self._host, self._port, '/', self._credentials)
        for attempt in range(1, retries + 1):
            try:
                self._connection = pika.BlockingConnection(parameters)
                break
            except pika.exceptions.AMQPConnectionError:
                if attempt == retries:
                    print(f"[rabbit] giving up: RabbitMQ at {self._host}:{self._port} is not reachable", flush=True)
                    raise
                print(f"[rabbit] cannot reach RabbitMQ at {self._host}:{self._port} "
                      f"(attempt {attempt}/{retries}), retrying in {delay}s", flush=True)
                time.sleep(delay)

        self._channel = self._connection.channel()
        self._queue = ''
        
        self._channel.exchange_declare(
            exchange="picturas",
            exchange_type=ExchangeType.direct,
            durable=True,
        )

    def send_rabbit_msg(self, msg, queue):
        self._channel.queue_declare(queue=self._queue, durable=True)

        self._channel.basic_publish(exchange="picturas", routing_key=queue, body=msg)

    
    def read_rabbit_msg(self, queue, callback):
        if self._queue == "":
            self._queue = queue

        self._channel.queue_declare(queue=self._queue, durable=True)
        
        self._channel.basic_consume(
            queue=self._queue,
            on_message_callback=callback,
            auto_ack=True,
        )

        self._channel.start_consuming()

    def keep_alive(self, time_limit=1):
        """Serves the connection (heartbeats) for up to time_limit seconds.

        Tools whose work takes longer than the broker's heartbeat timeout must call this
        regularly from inside their message callback, or the connection is dropped.
        It does not deliver new messages while inside a callback.
        """
        self._connection.process_data_events(time_limit=time_limit)