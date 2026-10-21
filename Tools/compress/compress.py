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

# CRF is the quality knob of H.264: higher = smaller file, lower quality.
# 23 is ffmpeg's own default and is visually close to the original.
LEVELS = {
    'light': 23,
    'medium': 28,
    'strong': 33,
}
DEFAULT_LEVEL = 'medium'

# Speed settings, tunable from docker-compose without rebuilding the code:
#   COMPRESS_PRESET  x264 speed preset (ultrafast ... veryslow). veryfast is a good
#                    balance: much faster than "medium", files only slightly bigger.
#   COMPRESS_THREADS threads for the encoder. Keep it at or below the CPUs the
#                    container is allowed to use, so the host stays responsive.
PRESET = os.environ.get('COMPRESS_PRESET', 'veryfast')
THREADS = os.environ.get('COMPRESS_THREADS', '2')


class CompressError(Exception):
    def __init__(self, message, code):
        super().__init__(message)
        self.code = code


def _lower_priority():
    # Runs in the child process before ffmpeg starts: lets the rest of the system
    # (Docker, RabbitMQ, the OS) win over the encoder when the CPU is busy.
    try:
        os.nice(10)
    except Exception:
        pass


class Compress:
    def __init__(self):
        self._tool_msg = ToolMSG('picturas-compress-tool-ms',
                                 'compress',
                                 env.RABBITMQ_HOST,
                                 env.RABBITMQ_PORT,
                                 env.RABBITMQ_USERNAME,
                                 env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 2100,
            'error_processing': 2101,
            'bad_params': 2102,
            'input_missing': 2103,
        }

    # ------------------------------------------------------------------ ffmpeg

    @staticmethod
    def _probe(path):
        """(duration in seconds, width, height) in one ffprobe call. Unknown values are None."""
        try:
            out = subprocess.run(
                ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                 '-show_entries', 'format=duration:stream=width,height',
                 '-of', 'json', path],
                capture_output=True, text=True, timeout=60,
            )
            data = json.loads(out.stdout)
            stream = (data.get('streams') or [{}])[0]
            duration = data.get('format', {}).get('duration')
            return (float(duration) if duration else None,
                    stream.get('width'),
                    stream.get('height'))
        except Exception:
            return None, None, None

    def compress_video(self, in_path, out_path, level):
        """Re-encodes the video with H.264 + AAC into an MP4 at out_path."""
        crf = LEVELS[level]
        duration, width, height = self._probe(in_path)

        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        # Written to a temporary name and renamed at the end, so a half-written
        # file is never mistaken for a finished result.
        tmp_path = out_path + '.part'

        # H.264 with yuv420p needs even dimensions. Only add the scale filter (which
        # touches every frame) when the video really has an odd width or height.
        vf = []
        if width is None or height is None or width % 2 or height % 2:
            vf = ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2']

        cmd = [
            'ffmpeg', '-y', '-hide_banner', '-nostdin', '-loglevel', 'error',
            '-i', in_path,
            '-map', '0:v:0', '-map', '0:a?',           # first video stream, audio if any
            *vf,
            '-c:v', 'libx264', '-preset', PRESET, '-crf', str(crf),
            '-threads', THREADS,
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart',                  # playable before fully downloaded
            '-f', 'mp4',
            '-progress', 'pipe:1', '-nostats', '-stats_period', '2',
            tmp_path,
        ]

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                text=True, preexec_fn=_lower_priority)
        error_lines = deque(maxlen=20)
        name = os.path.basename(in_path)

        def read_progress():
            last_logged = -10
            for line in proc.stdout:
                key, _, value = line.strip().partition('=')
                # both of these are in microseconds (out_time_ms is misnamed in ffmpeg)
                if key in ('out_time_us', 'out_time_ms') and duration:
                    try:
                        seconds = int(value) / 1_000_000
                    except ValueError:
                        continue
                    pct = min(99, int(seconds * 100 / duration))
                    if pct >= last_logged + 10:
                        last_logged = pct - pct % 10
                        print(f'[compress] {name}: {pct}%', flush=True)
                elif key == 'speed' and value not in ('', 'N/A'):
                    # 1.0x means "as fast as the video plays"; higher is faster
                    print(f'[compress] {name}: speed {value}', flush=True)

        def read_errors():
            for line in proc.stderr:
                error_lines.append(line.strip())

        readers = [threading.Thread(target=read_progress, daemon=True),
                   threading.Thread(target=read_errors, daemon=True)]
        for t in readers:
            t.start()

        try:
            # Encoding takes minutes. Keep serving the RabbitMQ connection meanwhile,
            # otherwise the broker thinks we died (missed heartbeats) and drops it.
            while proc.poll() is None:
                self._tool_msg.keep_alive(1)
        except BaseException:
            proc.kill()
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            raise
        finally:
            for t in readers:
                t.join(timeout=5)

        if proc.returncode != 0:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            raise CompressError('ffmpeg failed: ' + ' | '.join(error_lines), self._codes['error_processing'])

        os.replace(tmp_path, out_path)

        in_size = os.path.getsize(in_path)
        out_size = os.path.getsize(out_path)
        print(f'[compress] {name}: {in_size / 1e6:.1f} MB -> {out_size / 1e6:.1f} MB '
              f'({out_size * 100 / in_size:.0f}%)', flush=True)

    # ---------------------------------------------------------------- messages

    def _send_error(self, request_id, response_id, timestamp, code, message, input_path):
        cur_timestamp = datetime.datetime.now(pytz.utc)
        processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
        # ToolMSG puts its first id in "messageId" and its second in "correlationId" for
        # errors (the opposite of success), and the projects service looks processes up by
        # "correlationId". So the ids are passed in swapped order here on purpose.
        self._tool_msg.send_msg(
            response_id,
            request_id,
            cur_timestamp.isoformat(),
            'error',
            processing_time,
            None,
            err_code=code,
            err_msg=message,
            og_img_uri=input_path,
        )

    def compress_callback(self, ch, method, properties, body):
        try:
            info = json.loads(body.decode())
            request_id = info['messageId']
            timestamp = datetime.datetime.fromisoformat(info['timestamp'])
            procedure = info['procedure']
            params = info['parameters']
            in_path = params['inputImageURI']
            out_path = params['outputImageURI']
            level = params.get('level', DEFAULT_LEVEL)
        except Exception as e:
            # can't even tell who asked, so nobody can be answered: just say it in the log
            print(f'[compress] ignoring a malformed message: {e!r} body={body[:300]!r}', flush=True)
            return

        response_id = f'compress-{self._counter}-{request_id}'
        self._counter += 1
        print(f'[compress] job received: id={request_id} level={level} preset={PRESET} '
              f'threads={THREADS} in={in_path} out={out_path}', flush=True)

        try:
            if procedure != 'compress':
                raise CompressError('The procedure received does not fit into this tool',
                                    self._codes['wrong_procedure'])
            if level not in LEVELS:
                raise CompressError(f"level must be one of {', '.join(LEVELS)}", self._codes['bad_params'])
            if not os.path.isfile(in_path):
                raise CompressError(f'Input video not found: {in_path}', self._codes['input_missing'])

            self.compress_video(in_path, out_path, level)

            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            print(f'[compress] job done: id={request_id} in {processing_time / 1000:.1f}s, answering', flush=True)
            self._tool_msg.send_msg(
                request_id,
                response_id,
                cur_timestamp.isoformat(),
                'success',
                processing_time,
                out_path,
                type='video',
            )
        except CompressError as e:
            print(f'[compress] job failed: id={request_id} code={e.code} {e}', flush=True)
            self._send_error(request_id, response_id, timestamp, e.code, str(e), in_path)
        except Exception as e:
            print(f'[compress] job failed: id={request_id} {e!r}', flush=True)
            self._send_error(request_id, response_id, timestamp, self._codes['error_processing'], str(e), in_path)

    def exec(self, args):
        print('[compress] connected, waiting for jobs on compress_queue', flush=True)
        while True:
            self._tool_msg.read_msg(self.compress_callback)


if __name__ == '__main__':
    compress_tool = Compress()
    compress_tool.exec(sys.argv)
    