"""Small client for the PictuRAS API, used by the e2e tests.

Everything goes through the public entry point (nginx -> API gateway), as the
browser does. The base URL can be changed with E2E_BASE_URL.
"""
import hashlib
import os
import struct
import threading
import time
import uuid

import requests
import socketio
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = os.environ.get("E2E_BASE_URL", "https://localhost:8080").rstrip("/")
API = BASE_URL + "/api-gateway"
FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")
PROCESS_TIMEOUT = float(os.environ.get("E2E_PROCESS_TIMEOUT", "180"))

MIME = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"}


def fixture(name):
    return os.path.join(FIXTURES, name)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class ProcessFailed(Exception):
    """The run ended with a process-error notification."""


class ApiError(Exception):
    def __init__(self, resp):
        super().__init__(f"{resp.request.method} {resp.url} -> {resp.status_code}: {resp.text[:300]}")
        self.status = resp.status_code
        self.text = resp.text


class User:
    """A registered (or anonymous) user with its own session and socket."""

    def __init__(self, kind="free"):
        self.kind = kind
        self.http = requests.Session()
        self.http.verify = False
        body = {"type": kind}
        if kind != "anonymous":
            body.update({
                "name": f"e2e {kind}",
                "email": f"e2e-{kind}-{uuid.uuid4().hex[:10]}@test.local",
                "password": "e2e-password-123",
            })
        r = self.http.post(API + "/users", json=body)
        if r.status_code != 201:
            raise ApiError(r)
        data = r.json()
        self.id = data["user"]["_id"]
        self.token = data["jwt"]
        self.http.headers["Authorization"] = f"Bearer {self.token}"
        self.errors = []
        self.updates = 0
        self._sio = None

    # ------------------------------------------------------------ socket
    def connect_socket(self):
        """Listen for process-update / process-error, like the frontend."""
        if self._sio:
            return
        sio = socketio.Client(ssl_verify=False, reconnection=True)

        @sio.on("process-error")
        def _on_error(payload):
            self.errors.append(payload)

        @sio.on("process-update")
        def _on_update(_payload):
            self.updates += 1

        sio.connect(BASE_URL, transports=["websocket"], auth={"token": self.token},
                    socketio_path="socket.io", wait_timeout=15)
        self._sio = sio

    def close(self):
        if self._sio:
            try:
                self._sio.disconnect()
            except Exception:
                pass

    # ------------------------------------------------------------- helpers
    def _url(self, path):
        return f"{API}/projects/{self.id}{path}"

    def get(self, path="", expect=200):
        r = self.http.get(self._url(path))
        if expect and r.status_code != expect:
            raise ApiError(r)
        return r

    def profile(self):
        r = self.http.get(f"{API}/users/{self.id}")
        if r.status_code != 200:
            raise ApiError(r)
        return r.json()

    # ------------------------------------------------------------ projects
    def create_project(self, kind="video", name=None, expect=201):
        r = self.http.post(self._url(""), json={"name": name or f"e2e {kind} {uuid.uuid4().hex[:6]}", "type": kind})
        if expect and r.status_code != expect:
            raise ApiError(r)
        return r.json() if r.status_code == 201 else r

    def list_projects(self):
        return self.get("").json()

    def project(self, pid):
        return self.get(f"/{pid}").json()

    def version(self, pid):
        return str(self.project(pid)["version"])

    def _mutate(self, method, pid, path, json=None, expect=None):
        headers = {"X-Project-Version": self.version(pid)}
        r = self.http.request(method, self._url(f"/{pid}{path}"), json=json, headers=headers)
        if expect is not None and r.status_code != expect:
            raise ApiError(r)
        return r

    def add_image(self, pid, path, expect=None):
        headers = {"X-Project-Version": self.version(pid)}
        with open(path, "rb") as f:
            r = self.http.post(self._url(f"/{pid}/img"), headers=headers,
                               files={"image": (os.path.basename(path), f, "image/png")})
        if expect is not None and r.status_code != expect:
            raise ApiError(r)
        return r

    # --------------------------------------------------------------- tools
    def add_tool(self, pid, procedure, params, expect=None):
        return self._mutate("POST", pid, "/tool", {"procedure": procedure, "params": params}, expect)

    def update_tool(self, pid, tool_id, params, expect=None):
        return self._mutate("PUT", pid, f"/tool/{tool_id}", {"params": params}, expect)

    def tools(self, pid):
        return sorted(self.project(pid)["tools"], key=lambda t: t["position"])

    def reorder(self, pid, tools, expect=None):
        body = [{"procedure": t["procedure"], "params": t["params"], "position": i} for i, t in enumerate(tools)]
        return self._mutate("POST", pid, "/reorder", body, expect)

    # ------------------------------------------------------------- videos
    def upload_video(self, pid, path, name=None, content_type=None):
        """init -> sign + PUT every part -> complete (same flow as the frontend)."""
        size = os.path.getsize(path)
        ct = content_type or MIME[os.path.splitext(path)[1].lower()]
        base = self._url(f"/{pid}/video")
        r = self.http.post(base + "/init", json={"contentType": ct, "size": size})
        if r.status_code != 200:
            raise ApiError(r)
        up = r.json()
        parts = []
        with open(path, "rb") as f:
            for n in range(1, int(up.get("partCount") or -(-size // up["partSize"])) + 1):
                blob = f.read(up["partSize"])
                s = self.http.post(base + "/sign", json={"bucket": up["bucket"], "key": up["key"],
                                                         "uploadId": up["uploadId"], "partNumber": n})
                if s.status_code != 200:
                    raise ApiError(s)
                put = requests.put(s.json()["url"], data=blob, verify=False)
                if put.status_code >= 300:
                    raise ApiError(put)
                parts.append({"PartNumber": n, "ETag": put.headers["ETag"]})
        c = self.http.post(base + "/complete", json={"bucket": up["bucket"], "key": up["key"],
                                                     "uploadId": up["uploadId"], "parts": parts,
                                                     "name": name or os.path.basename(path)})
        if c.status_code != 201:
            raise ApiError(c)
        return c.json()

    def init_upload(self, pid, content_type, size):
        return self.http.post(self._url(f"/{pid}/video/init"), json={"contentType": content_type, "size": size})

    def abort_upload(self, pid, up):
        return self.http.post(self._url(f"/{pid}/video/abort"),
                              json={"bucket": up["bucket"], "key": up["key"], "uploadId": up["uploadId"]})

    def video_project(self, *files):
        """A new video project with the given fixture videos uploaded."""
        p = self.create_project("video")
        vids = [self.upload_video(p["_id"], fixture(f)) for f in files]
        return p["_id"], [v["_id"] for v in vids]

    # ---------------------------------------------------------- processing
    def results(self, pid):
        return self.get(f"/{pid}/process/url").json()

    def process(self, pid, expect=None):
        self.connect_socket()
        self.errors.clear()
        return self._mutate("POST", pid, "/process", {}, expect)

    def run(self, pid, done=None, timeout=PROCESS_TIMEOUT):
        """Starts processing and waits until `done(results)` is true.
        Raises ProcessFailed when the server reports an error."""
        before = self.results(pid)
        had_results = bool(before.get("videos") or before.get("frames"))
        if done is None and had_results:
            raise ValueError("the project already has results: pass `done` to tell the new ones apart")
        r = self.process(pid)
        if r.status_code != 201:
            raise ApiError(r)
        if done is None:
            def done(res):
                return len(res.get("videos", [])) + len(res.get("frames", [])) > 0
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.errors:
                raise ProcessFailed(str(self.errors[-1]))
            res = self.results(pid)
            if done(res):
                return res
            time.sleep(1)
        raise TimeoutError(f"processing of {pid} did not finish in {timeout}s")

    def download(self, url):
        r = requests.get(url, verify=False)
        if r.status_code != 200:
            raise ApiError(r)
        return r.content


# ------------------------------------------------------- media inspection
def _boxes(data, start=0, end=None):
    end = len(data) if end is None else end
    i = start
    while i + 8 <= end:
        size, kind = struct.unpack(">I4s", data[i:i + 8])
        header = 8
        if size == 1:
            size = struct.unpack(">Q", data[i + 8:i + 16])[0]
            header = 16
        elif size == 0:
            size = end - i
        if size < header:
            break
        yield kind.decode("latin1"), i + header, i + size
        i += size


def _find(data, path, start=0, end=None):
    for kind, s, e in _boxes(data, start, end):
        if kind == path[0]:
            if len(path) == 1:
                return s, e
            found = _find(data, path[1:], s, e)
            if found:
                return found
    return None


def mp4_info(data):
    """Duration (s), handler types of the tracks and the major brand of an MP4."""
    ftyp = _find(data, ["ftyp"])
    brand = data[ftyp[0]:ftyp[0] + 4].decode("latin1") if ftyp else None
    mvhd = _find(data, ["moov", "mvhd"])
    if not mvhd:
        raise ValueError("not an MP4 (no moov/mvhd)")
    s = mvhd[0]
    if data[s] == 1:
        timescale, duration = struct.unpack(">IQ", data[s + 20:s + 32])
    else:
        timescale, duration = struct.unpack(">II", data[s + 12:s + 20])
    handlers = []
    moov = _find(data, ["moov"])
    for kind, ts, te in _boxes(data, *moov):
        if kind == "trak":
            hdlr = _find(data, ["mdia", "hdlr"], ts, te)
            if hdlr:
                handlers.append(data[hdlr[0] + 8:hdlr[0] + 12].decode("latin1"))
    return {"duration": duration / timescale, "tracks": handlers, "brand": brand}


def image_size(data):
    """(width, height, format) of a PNG or JPEG."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        w, h = struct.unpack(">II", data[16:24])
        return w, h, "png"
    if data[:2] == b"\xff\xd8":
        i = 2
        while i < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return w, h, "jpeg"
            length = struct.unpack(">H", data[i + 2:i + 4])[0]
            i += 2 + length
    raise ValueError("not a PNG or JPEG")
