"""
Tool `trim`: recorte temporal de vídeo (UC-VID-002).

Mensagem recebida (fila trim_queue):
{ "messageId": "...", "timestamp": "...", "procedure": "trim",
  "parameters": { "inputImageURI": "./images/.../src/video.mp4",
                  "outputImageURI": "./images/.../out/video.mp4",
                  "videoId": "...", "startTime": 2.5, "endTime": 10 } }   # segundos

O resultado é sempre um MP4 (H.264 + AAC), como o do compress: o serviço de
projetos grava-o em out/<nome>.mp4.
"""
import datetime
import json
import os
import subprocess
import sys
import threading
from collections import deque

import pytz

from utils.tool_msg import ToolMSG
import utils.env as env


class TrimMSG(ToolMSG):
    """ToolMSG com a fila do trim e mensagens de erro com os ids certos.
    Existe para não alterar o utils/tool_msg.py partilhado com as tools de imagem."""
    queues = {**ToolMSG.queues, 'trim': 'trim_queue'}

    def send_msg(self, msg_id, resp_msg_id, timestamp, status, processingTime,
                 new_img_uri, type="video", err_code=None, err_msg=None, og_img_uri=None):
        if status != 'error':
            return super().send_msg(msg_id, resp_msg_id, timestamp, status,
                                    processingTime, new_img_uri, type=type)
        msg = {
            "messageId": resp_msg_id,
            "correlationId": msg_id,
            "timestamp": timestamp,
            "status": status,
            "error": {
                "code": err_code,
                "message": err_msg,
                "msg": err_msg,   # o `projects` lê error.msg
                "details": {"inputFileURI": og_img_uri},
            },
            "metadata": {"processingTime": processingTime,
                         "microservice": self._microservice_name},
        }
        self._rabbit_mq.send_rabbit_msg(json.dumps(msg), self._proj_queue)


SUPPORTED_EXTENSIONS = {'.mp4', '.webm', '.mov'}
# Os mesmos codecs que o upload aceita (UC-VID-001 / Q1).
SUPPORTED_VIDEO_CODECS = {'h264', 'vp8', 'vp9'}

# Velocidade do encoder, ajustável no docker-compose sem rebuild (ver compress).
PRESET = os.environ.get('TRIM_PRESET', 'veryfast')
THREADS = os.environ.get('TRIM_THREADS', '2')


class TrimError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def _lower_priority():
    # Corre no processo filho antes do ffmpeg: o resto do sistema tem prioridade.
    try:
        os.nice(10)
    except Exception:
        pass


class Trim:
    def __init__(self):
        self._tool_msg = TrimMSG('picturas-trim-tool-ms', 'trim',
                                 env.RABBITMQ_HOST, env.RABBITMQ_PORT,
                                 env.RABBITMQ_USERNAME, env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 1700,
            'invalid_range': 1701,       # RN1 / RN2
            'unsupported_format': 1702,  # formato ou codec não suportado
            'error_processing': 1703,
        }

    # ------------------------------------------------------------------ ffprobe

    def probe(self, path):
        """Devolve (duração em segundos, codec, largura, altura)."""
        try:
            out = subprocess.run(
                ['ffprobe', '-v', 'error', '-print_format', 'json',
                 '-show_format', '-show_streams', path],
                capture_output=True, text=True, check=True, timeout=60)
            info = json.loads(out.stdout)
        except Exception:
            raise TrimError(self._codes['unsupported_format'],
                            'The video file could not be read (unsupported or corrupted).')

        video = next((s for s in info.get('streams', [])
                      if s.get('codec_type') == 'video'), None)
        if video is None:
            raise TrimError(self._codes['unsupported_format'],
                            'The file does not contain a video stream.')

        codec = video.get('codec_name', '')
        if codec not in SUPPORTED_VIDEO_CODECS:
            raise TrimError(self._codes['unsupported_format'],
                            f'Video codec "{codec}" is not supported.')
        try:
            duration = float(info['format']['duration'])
        except (KeyError, ValueError, TypeError):
            raise TrimError(self._codes['unsupported_format'],
                            'Could not determine the video duration.')
        return duration, codec, video.get('width'), video.get('height')

    def validate_range(self, start, end, duration):
        if start < 0 or end <= start:                       # RN1
            raise TrimError(self._codes['invalid_range'],
                            'Start time must be lower than end time.')
        if end > duration + 0.01:                           # RN2
            raise TrimError(self._codes['invalid_range'],
                            f'The interval must be inside the video duration ({duration:.2f}s).')

    # ------------------------------------------------------------------- ffmpeg

    def trim_video(self, in_path, out_path, start, end):
        ext = os.path.splitext(in_path)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise TrimError(self._codes['unsupported_format'],
                            f'Video format "{ext}" is not supported.')
        if not os.path.isfile(in_path):
            raise TrimError(self._codes['error_processing'],
                            'The source video is not available.')

        duration, _, width, height = self.probe(in_path)
        self.validate_range(start, end, duration)
        end = min(end, duration)

        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        # Escreve para .part e só no fim renomeia: nunca fica um vídeo incompleto
        # com o nome do resultado (REQ-VID-TRIM-016).
        tmp_path = out_path + '.part'

        # H.264 com yuv420p precisa de dimensões pares.
        vf = []
        if width is None or height is None or width % 2 or height % 2:
            vf = ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2']

        cmd = [
            'ffmpeg', '-y', '-hide_banner', '-nostdin', '-loglevel', 'error',
            # -ss antes de -i: procura rápida, e exata porque o vídeo é recodificado
            '-ss', f'{start:.3f}', '-i', in_path, '-t', f'{end - start:.3f}',
            '-map', '0:v:0', '-map', '0:a?',
            *vf,
            '-c:v', 'libx264', '-preset', PRESET, '-crf', '20',
            '-threads', THREADS,
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart',
            '-f', 'mp4',
            '-progress', 'pipe:1', '-nostats',
            tmp_path,
        ]

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                text=True, preexec_fn=_lower_priority)
        error_lines = deque(maxlen=20)
        name = os.path.basename(in_path)
        length = end - start

        def read_progress():
            last_logged = -10
            for line in proc.stdout:
                key, _, value = line.strip().partition('=')
                if key in ('out_time_us', 'out_time_ms') and length > 0:
                    try:
                        pct = min(99, int(int(value) / 1_000_000 * 100 / length))
                    except ValueError:
                        continue
                    if pct >= last_logged + 10:
                        last_logged = pct - pct % 10
                        print(f'[trim] {name}: {pct}%', flush=True)

        def read_errors():
            for line in proc.stderr:
                error_lines.append(line.strip())

        readers = [threading.Thread(target=read_progress, daemon=True),
                   threading.Thread(target=read_errors, daemon=True)]
        for t in readers:
            t.start()

        try:
            # A recodificação pode demorar minutos: continua a servir a ligação ao
            # RabbitMQ, senão o broker deixa de receber heartbeats e fecha-a.
            while proc.poll() is None:
                self._tool_msg.keep_alive(1)
        except BaseException:
            proc.kill()
            self._remove(tmp_path)
            raise
        finally:
            for t in readers:
                t.join(timeout=5)

        if proc.returncode != 0:
            self._remove(tmp_path)
            print('[trim] ffmpeg failed: ' + ' | '.join(error_lines), flush=True)
            raise TrimError(self._codes['error_processing'],
                            'An error occurred while trimming the video.')

        os.replace(tmp_path, out_path)
        print(f'[trim] {name}: {start:.2f}s-{end:.2f}s -> '
              f'{os.path.getsize(out_path) / 1e6:.1f} MB', flush=True)

    @staticmethod
    def _remove(path):
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    # ----------------------------------------------------------------- messages

    def _elapsed_ms(self, timestamp):
        now = datetime.datetime.now(pytz.utc)
        return now, (now - timestamp).total_seconds() * 1000

    def trim_callback(self, ch, method, properties, body):
        try:
            info = json.loads(body.decode())
            msg_id = info['messageId']
            timestamp = datetime.datetime.fromisoformat(info['timestamp'].replace('Z', '+00:00'))
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=pytz.utc)
            procedure = info['procedure']
            params = info['parameters']
            in_path = params['inputImageURI']
            out_path = params['outputImageURI']
        except Exception as e:
            # sem ids não há a quem responder: fica só no log
            print(f'[trim] ignoring a malformed message: {e!r} body={body[:300]!r}', flush=True)
            return

        resp_msg_id = f'trim-{self._counter}-{msg_id}'
        self._counter += 1
        print(f'[trim] job received: id={msg_id} in={in_path} out={out_path}', flush=True)

        def send_error(code, message):
            print(f'[trim] job failed: id={msg_id} code={code} {message}', flush=True)
            now, ms = self._elapsed_ms(timestamp)
            self._tool_msg.send_msg(msg_id, resp_msg_id, now.isoformat(), 'error', ms,
                                    None, type='video', err_code=code,
                                    err_msg=message, og_img_uri=in_path)

        if procedure != 'trim':
            send_error(self._codes['wrong_procedure'],
                       'The procedure received does not fit into this tool')
            return

        try:
            start = float(params['startTime'])
            end = float(params['endTime'])
        except (KeyError, TypeError, ValueError):
            send_error(self._codes['invalid_range'],
                       'startTime and endTime are required numeric values (seconds).')
            return

        try:
            self.trim_video(in_path, out_path, start, end)
            now, ms = self._elapsed_ms(timestamp)
            print(f'[trim] job done: id={msg_id} in {ms / 1000:.1f}s', flush=True)
            self._tool_msg.send_msg(msg_id, resp_msg_id, now.isoformat(), 'success',
                                    ms, out_path, type='video')
        except TrimError as e:
            send_error(e.code, e.message)
        except Exception as e:
            print(f'[trim] unexpected error: {e!r}', flush=True)
            send_error(self._codes['error_processing'],
                       'An error occurred while processing the request')

    def exec(self, args):
        print('[trim] connected, waiting for jobs on trim_queue', flush=True)
        while True:
            self._tool_msg.read_msg(self.trim_callback)


if __name__ == '__main__':
    Trim().exec(sys.argv)
