"""
Tool `trim`: recorte temporal de vídeo (UC-VID-002).

Mensagem recebida (fila trim_queue):
{ "messageId": "...", "timestamp": "...", "procedure": "trim",
  "parameters": { "inputImageURI": "./images/.../src/video.mp4",
                  "outputImageURI": "./images/.../out/video.mp4",
                  "startTime": 2.5, "endTime": 10 } }   # segundos
"""
import sys
import os
import json
import subprocess
import datetime
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
SUPPORTED_VIDEO_CODECS = {'h264', 'hevc', 'vp8', 'vp9', 'av1', 'mpeg4'}


class TrimError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


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

    def probe(self, path):
        """Devolve (duração em segundos, codec de vídeo)."""
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
        return duration, codec

    def validate_range(self, start, end, duration):
        if start < 0 or end <= start:                       # RN1
            raise TrimError(self._codes['invalid_range'],
                            'Start time must be lower than end time.')
        if end > duration + 0.001:                          # RN2
            raise TrimError(self._codes['invalid_range'],
                            f'Interval is outside the video duration ({duration:.2f}s).')

    def trim_video(self, in_path, out_path, start, end):
        ext = os.path.splitext(in_path)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise TrimError(self._codes['unsupported_format'],
                            f'Video format "{ext}" is not supported.')

        duration, _ = self.probe(in_path)
        self.validate_range(start, end, duration)

        os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)

        # escreve para .part e só no fim renomeia: nunca fica um vídeo incompleto
        tmp_path = out_path + '.part' + ext

        cmd = ['ffmpeg', '-y', '-i', in_path, '-ss', f'{start}', '-to', f'{end}']
        if ext == '.webm':
            cmd += ['-c:v', 'libvpx-vp9', '-c:a', 'libopus']
        else:
            cmd += ['-c:v', 'libx264', '-preset', 'veryfast',
                    '-c:a', 'aac', '-movflags', '+faststart']
        cmd += [tmp_path]

        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=3600)
            os.replace(tmp_path, out_path)
        except Exception as e:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            if isinstance(e, subprocess.CalledProcessError):
                print(e.stderr)
            raise TrimError(self._codes['error_processing'],
                            'An error occurred while trimming the video.')

    def _elapsed_ms(self, timestamp):
        now = datetime.datetime.now(pytz.utc)
        return now, (now - timestamp).total_seconds() * 1000

    def trim_callback(self, ch, method, properties, body):
        info = json.loads(body.decode())
        msg_id = info['messageId']
        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=pytz.utc)
        procedure = info['procedure']
        params = info['parameters']
        in_path = params['inputImageURI']
        out_path = params['outputImageURI']

        resp_msg_id = f'trim-{self._counter}-{msg_id}'
        self._counter += 1

        def send_error(code, message):
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
            self._tool_msg.send_msg(msg_id, resp_msg_id, now.isoformat(), 'success',
                                    ms, out_path, type='video')
        except TrimError as e:
            send_error(e.code, e.message)
        except Exception as e:
            print(e)
            send_error(self._codes['error_processing'],
                       'An error occurred while processing the request')

    def exec(self, args):
        while True:
            self._tool_msg.read_msg(self.trim_callback)


if __name__ == '__main__':
    Trim().exec(sys.argv)