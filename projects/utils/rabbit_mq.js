const amqp = require('amqplib/callback_api');

const rabbit_host = process.env.RABBITMQ_HOST;
const rabbit_port = process.env.RABBITMQ_PORT;
const rabbit_username = process.env.RABBITMQ_USER;
const rabbit_password = process.env.RABBITMQ_PASS;
const exchange = "picturas";

const rabbit_mq_sv = `amqp://${rabbit_username}:${rabbit_password}@${rabbit_host}:${rabbit_port}`;

const RECONNECT_MS = 3000;
const SEND_ATTEMPTS = 5;

// Opens a connection for one message. If RabbitMQ is unreachable the send is retried a
// few times and then reported in the log, instead of crashing the whole service.
function send_rabbit_msg(msg, queue, attempt = 1) {
    const retry = (reason) => {
        if (attempt >= SEND_ATTEMPTS) {
            console.error(`[rabbit] could not send to ${queue}: ${reason}`);
            return;
        }
        console.error(`[rabbit] send to ${queue} failed (${reason}), retrying (${attempt}/${SEND_ATTEMPTS})`);
        setTimeout(() => send_rabbit_msg(msg, queue, attempt + 1), 1000);
    };

    amqp.connect(rabbit_mq_sv, (err_sv, connection) => {
        if (err_sv) return retry(err_sv.message);
        // failures are handled by the callbacks below; without a listener an 'error' event would crash the process
        connection.on('error', () => {});

        connection.createChannel((err_conn, channel) => {
            if (err_conn) {
                try { connection.close(); } catch (_) {}
                return retry(err_conn.message);
            }
            channel.on('error', () => {});

            channel.assertExchange(exchange, 'direct', {
                durable: true
            });

            channel.publish(exchange, queue, Buffer.from(JSON.stringify(msg)));
        });

        setTimeout(() => {
            try { connection.close(); } catch (_) {}
        }, 500);
    });
}

// Consumes `queue` for as long as the service lives. If the connection is lost (for
// example RabbitMQ restarted) it reconnects by itself and keeps consuming.
function read_rabbit_msg(queue, callback) {
    const reconnect = (reason) => {
        console.error(`[rabbit] consumer of ${queue} lost (${reason}), reconnecting in ${RECONNECT_MS / 1000}s`);
        setTimeout(() => read_rabbit_msg(queue, callback), RECONNECT_MS);
    };

    amqp.connect(rabbit_mq_sv, (err_sv, connection) => {
        if (err_sv) return reconnect(err_sv.message);

        let lost = false;
        const onLost = (reason) => {
            if (lost) return;
            lost = true;
            try { connection.close(); } catch (_) {}
            reconnect(reason);
        };
        connection.on('error', (e) => onLost(e.message));
        connection.on('close', () => onLost('connection closed'));

        connection.createChannel((err_conn, channel) => {
            if (err_conn) return onLost(err_conn.message);
            channel.on('error', (e) => onLost(e.message));

            channel.assertExchange(exchange, 'direct', {
                durable: true
              });

            channel.assertQueue(queue, { durable: true }, (err_queue, q) => {
                if (err_queue) return onLost(err_queue.message);

                console.log(`[rabbit] consuming ${q.queue}`);
                channel.consume(q.queue, (msg) => {
                    if(msg != null){
                        callback(msg);
                        // Acknowledge the message
                        channel.ack(msg);
                    }
                }, {
                    noAck: false
                });
            });
        });
    });
}

module.exports = { send_rabbit_msg, read_rabbit_msg };
