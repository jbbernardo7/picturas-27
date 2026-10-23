"""
Tool `extract_frames`: frame extraction from a video (UC-VID-003).

It is always the last step of a video's chain, so the input is the video as
left by the previous tools (e.g. already trimmed). Times are relative to it.

Message received (queue extract_frames_queue):
{ "messageId": "...", "timestamp": "...", "procedure": "extract_frames",
  "parameters": { "inputImageURI": "./images/.../src/video.mp4",
                  "outputImageURI": "./images/.../out/video.mp4",  # frames go to out/video_frames/
                  "videoId": "...", "startTime": 0, "endTime": 10,     # seconds
                  "count": 5, "format": "png" | "jpeg", ... } }

Success reply: output.type = "frames", output.imageURI = the folder and
output.frames = [{ "file": "frame_000.png", "time": 0.0 }, ...] in time order.
"""
import datetime
import json
import os
import shutil
import subprocess
import sys

import pytz

from utils.tool_msg import ToolMSG
import utils.env as env


class ExtractMSG(ToolMSG):
    """ToolMSG with this tool's queue, the frame list on success and error
    messages with the right ids. Keeps utils/tool_msg.py untouched."""
    queues = {**ToolMSG.queues, 'extract_frames': 'extract_frames_queue'}

    def send_frames(self, msg_id, resp_msg_id, timestamp, processingTime, folder, frames):
        msg = {
            "messageId": resp_msg_id,
            "correlationId": msg_id,
            "timestamp": timestamp,
            "status": "success",
            "output": {"type": "frames", "imageURI": folder, "frames": frames},
            "metadata": {"processingTime": processingTime,
                         "microservice": self._microservice_name},
        }
        self._rabbit_mq.send_rabbit_msg(json.dumps(msg), self._proj_queue)

    def send_error(self, msg_id, resp_msg_id, timestamp, processingTime, code, message, og_uri):
        msg = {
            "messageId": resp_msg_id,
            "correlationId": msg_id,
            "timestamp": timestamp,
            "status": "error",
            "error": {
                "code": code,
                "message": message,
                "msg": message,   # `projects` reads error.msg
                "details": {"inputFileURI": og_uri},
            },
            "metadata": {"processingTime": processingTime,
                         "microservice": self._microservice_name},
        }
        self._rabbit_mq.send_rabbit_msg(json.dumps(msg), self._proj_queue)


SUPPORTED_EXTENSIONS = {'.mp4', '.webm', '.mov'}
SUPPORTED_VIDEO_CODECS = {'h264', 'vp8', 'vp9'}
FORMATS = {'png': 'png', 'jpeg': 'jpg'}   # RN3
MAX_FRAMES = 20                            # premium limit (RN1); projects checks per profile


class ExtractError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def _lower_priority():
    try:
        os.nice(10)
    except Exception:
        pass


def frame_times(start, end, count):
    """RN7: evenly spaced, start included, end excluded. One frame = start."""
    step = (end - start) / count
    return [start + i * step for i in range(count)]


class ExtractFrames:
    def __init__(self):
        self._tool_msg = ExtractMSG('picturas-extract-frames-tool-ms', 'extract_frames',
                                    env.RABBITMQ_HOST, env.RABBITMQ_PORT,
                                    env.RABBITMQ_USERNAME, env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 1800,
            'invalid_params': 1801,      # E3 / E4 / E6
            'unsupported_format': 1802,  # E9
            'error_processing': 1803,    # E7
        }

    # ------------------------------------------------------------------ checks

    def probe(self, path):
        """Duration (seconds) of the video, after checking it can be read."""
        try:
            out = subprocess.run(
                ['ffprobe', '-v', 'error', '-print_format', 'json',
                 '-show_format', '-show_streams', path],
                capture_output=True, text=True, check=True, timeout=60)
            info = json.loads(out.stdout)
        except Exception:
            raise ExtractError(self._codes['unsupported_format'],
                               'The video file could not be read (unsupported or corrupted).')

        video = next((s for s in info.get('streams', [])
                      if s.get('codec_type') == 'video'), None)
        if video is None:
            raise ExtractError(self._codes['unsupported_format'],
                               'The file does not contain a video stream.')
        codec = video.get('codec_name', '')
        if codec not in SUPPORTED_VIDEO_CODECS:
            raise ExtractError(self._codes['unsupported_format'],
                               f'Video codec "{codec}" is not supported.')
        try:
            return float(info['format']['duration'])
        except (KeyError, ValueError, TypeError):
            raise ExtractError(self._codes['unsupported_format'],
                               'Could not determine the video duration.')

    def check_params(self, start, end, count, fmt, duration):
        if start < 0 or end <= start:
            raise ExtractError(self._codes['invalid_params'],
                               'Start time must be lower than end time.')
        if end > duration + 0.01:
            raise ExtractError(self._codes['invalid_params'],
                               f'The interval must be inside the video duration ({duration:.2f}s).')
        if not isinstance(count, int) or count < 1 or count > MAX_FRAMES:
            raise ExtractError(self._codes['invalid_params'],
                               f'The number of frames must be between 1 and {MAX_FRAMES}.')
        if fmt not in FORMATS:
            raise ExtractError(self._codes['invalid_params'],
                               'Output format must be PNG or JPEG.')

    # ------------------------------------------------------------------ ffmpeg

    def extract(self, in_path, out_dir, start, end, count, fmt):
        ext = os.path.splitext(in_path)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ExtractError(self._codes['unsupported_format'],
                               f'Video format "{ext}" is not supported.')
        if not os.path.isfile(in_path):
            raise ExtractError(self._codes['error_processing'],
                               'The source video is not available.')

        duration = self.probe(in_path)
        self.check_params(start, end, count, fmt, duration)
        end = min(end, duration)

        # Frames go to <out>.part and the folder is renamed only at the end:
        # a failed job never leaves a partial set behind (REQ-031).
        tmp_dir = out_dir + '.part'
        self._remove(tmp_dir)
        self._remove(out_dir)
        os.makedirs(tmp_dir)

        name = os.path.basename(in_path)
        frames = []
        try:
            for i, t in enumerate(frame_times(start, end, count)):
                file_name = f'frame_{i:03d}.{FORMATS[fmt]}'
                cmd = ['ffmpeg', '-y', '-hide_banner', '-nostdin', '-loglevel', 'error',
                       '-ss', f'{t:.3f}', '-i', in_path, '-frames:v', '1']
                if fmt == 'jpeg':
                    cmd += ['-q:v', '2']
                cmd.append(os.path.join(tmp_dir, file_name))

                proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL,
                                        stderr=subprocess.PIPE, text=True,
                                        preexec_fn=_lower_priority)
                # keep serving the RabbitMQ connection while ffmpeg runs
                while proc.poll() is None:
                    self._tool_msg.keep_alive(1)
                err = proc.stderr.read() if proc.stderr else ''
                if proc.returncode != 0 or not os.path.isfile(os.path.join(tmp_dir, file_name)):
                    print(f'[extract_frames] ffmpeg failed at {t:.3f}s: {err.strip()[-500:]}',
                          flush=True)
                    raise ExtractError(self._codes['error_processing'],
                                       'An error occurred while extracting the frames.')

                frames.append({'file': file_name, 'time': round(t, 3)})
                print(f'[extract_frames] {name}: frame {i + 1}/{count} at {t:.2f}s', flush=True)
        except BaseException:
            self._remove(tmp_dir)
            raise

        os.replace(tmp_dir, out_dir)
        return frames

    @staticmethod
    def _remove(path):
        if os.path.isdir(path):
            shutil.rmtree(path, ignore_errors=True)
        elif os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    # ---------------------------------------------------------------- messages

    def _elapsed_ms(self, timestamp):
        now = datetime.datetime.now(pytz.utc)
        return now, (now - timestamp).total_seconds() * 1000

    def callback(self, ch, method, properties, body):
        try:
            info = json.loads(body.decode())
            msg_id = info['messageId']
            timestamp = datetime.datetime.fromisoformat(info['timestamp'].replace('Z', '+00:00'))
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=pytz.utc)
            procedure = info['procedure']
            params = info['parameters']
            in_path = params['inputImageURI']
            # The chain passes the video path it would write (e.g. out/clip.mp4),
            # which can be this job's own input: always use a sibling folder.
            out_dir = os.path.splitext(params['outputImageURI'])[0] + '_frames'
        except Exception as e:
            print(f'[extract_frames] ignoring a malformed message: {e!r} body={body[:300]!r}',
                  flush=True)
            return

        resp_msg_id = f'extract-frames-{self._counter}-{msg_id}'
        self._counter += 1
        print(f'[extract_frames] job received: id={msg_id} in={in_path} out={out_dir}', flush=True)

        def send_error(code, message):
            print(f'[extract_frames] job failed: id={msg_id} code={code} {message}', flush=True)
            now, ms = self._elapsed_ms(timestamp)
            self._tool_msg.send_error(msg_id, resp_msg_id, now.isoformat(), ms,
                                      code, message, in_path)

        if procedure != 'extract_frames':
            send_error(self._codes['wrong_procedure'],
                       'The procedure received does not fit into this tool')
            return

        try:
            start = float(params['startTime'])
            end = float(params['endTime'])
            count = int(params['count'])
            if float(params['count']) != count:
                raise ValueError
            fmt = str(params.get('format', 'png')).lower()
        except (KeyError, TypeError, ValueError):
            send_error(self._codes['invalid_params'],
                       'startTime, endTime and a whole number of frames are required.')
            return

        try:
            frames = self.extract(in_path, out_dir, start, end, count, fmt)
            now, ms = self._elapsed_ms(timestamp)
            print(f'[extract_frames] job done: id={msg_id} {len(frames)} frames in {ms / 1000:.1f}s',
                  flush=True)
            self._tool_msg.send_frames(msg_id, resp_msg_id, now.isoformat(), ms, out_dir, frames)
        except ExtractError as e:
            send_error(e.code, e.message)
        except Exception as e:
            print(f'[extract_frames] unexpected error: {e!r}', flush=True)
            send_error(self._codes['error_processing'],
                       'An error occurred while processing the request')

    def exec(self, args):
        print('[extract_frames] connected, waiting for jobs on extract_frames_queue', flush=True)
        while True:
            self._tool_msg.read_msg(self.callback)


if __name__ == '__main__':
    ExtractFrames().exec(sys.argv)
