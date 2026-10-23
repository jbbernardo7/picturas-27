"""Requisitos partilhados: submissão, encadeamento (SUBMIT) e resultados (STATUS)."""
import hashlib

import pytest

from client import fixture, mp4_info, sha256_file


def durations(user, res):
    return sorted(round(mp4_info(user.download(v["url"]))["duration"], 1) for v in res["videos"])


@pytest.mark.tst("TST-SUBMIT-02")
def test_anonymous_cannot_use_video_tools(anon_user):
    """Um anónimo não pode gravar as ferramentas de recorte nem de extração."""
    pid = anon_user.create_project("image")["_id"]
    for procedure in ("trim", "extract_frames"):
        r = anon_user.add_tool(pid, procedure, {"videoId": "x", "startTime": 0, "endTime": 1})
        assert r.status_code == 403, procedure


@pytest.mark.tst("TST-SUBMIT-07", "TST-SUBMIT-09")
def test_tools_belong_to_one_video(free_user):
    """Cada ferramenta aplica-se a um vídeo; um 2.º recorte do mesmo vídeo é recusado; só os vídeos com ferramentas dão resultado."""
    pid, (a, b, c) = free_user.video_project("clip_h264.mp4", "clip_h264.mov", "clip_vp9.webm")
    free_user.add_tool(pid, "trim", {"videoId": a, "startTime": 0, "endTime": 3}, expect=201)
    r = free_user.add_tool(pid, "trim", {"videoId": a, "startTime": 0, "endTime": 5})
    assert r.status_code == 400 and "already has" in r.text
    free_user.add_tool(pid, "trim", {"videoId": b, "startTime": 0, "endTime": 5}, expect=201)
    res = free_user.run(pid)
    assert len(res["videos"]) == 2           # c has no tools
    assert durations(free_user, res) == [3.0, 5.0]


@pytest.mark.tst("TST-SUBMIT-08")
def test_trim_then_compress(free_user):
    """Um recorte de 4 s seguido de compressão dá um único resultado com 4 s."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 1, "endTime": 5}, expect=201)
    free_user.add_tool(pid, "compress", {"videoId": vid, "level": "strong"}, expect=201)
    res = free_user.run(pid)
    assert durations(free_user, res) == [4.0]


@pytest.mark.tst("TST-SUBMIT-06")
def test_trim_and_compress_do_not_use_daily_operations(fresh_free_user):
    """O recorte e a compressão não consomem as operações diárias do Registado."""
    u = fresh_free_user
    before = u.profile().get("remaining_operations")
    pid, (vid,) = u.video_project("clip_h264.mp4")
    u.add_tool(pid, "trim", {"videoId": vid, "startTime": 0, "endTime": 4}, expect=201)
    u.add_tool(pid, "compress", {"videoId": vid, "level": "medium"}, expect=201)
    u.run(pid)
    assert u.profile().get("remaining_operations") == before


@pytest.mark.tst("TST-SUBMIT-10")
@pytest.mark.parametrize("name", ["clip_h264.mp4", "clip_h264.mov", "clip_vp8.webm", "clip_vp9.webm"])
def test_every_accepted_format_is_processed(premium_user, name):
    """Cada formato aceite (MP4, MOV, WEBM VP8 e VP9) passa por recorte, compressão e extração."""
    pid, (vid,) = premium_user.video_project(name)
    premium_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 1, "endTime": 7}, expect=201)
    premium_user.add_tool(pid, "compress", {"videoId": vid, "level": "medium"}, expect=201)
    premium_user.add_tool(pid, "extract_frames", {
        "videoId": vid, "startTime": 0, "endTime": 6, "count": 2, "format": "jpeg",
        "destination": {"mode": "new", "name": f"e2e {name}"}}, expect=201)
    res = premium_user.run(pid, done=lambda r: len(r.get("frames", [])) > 0)
    assert res["frames"][0]["count"] == 2


@pytest.mark.tst("TST-STATUS-07")
def test_new_run_replaces_results(free_user):
    """Uma nova execução substitui o resultado anterior (8 s → 4 s)."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 2, "endTime": 10}, expect=201)
    assert durations(free_user, free_user.run(pid)) == [8.0]
    tool = free_user.tools(pid)[0]
    free_user.update_tool(pid, tool["_id"], {"videoId": vid, "startTime": 0, "endTime": 4}, expect=204)
    res = free_user.run(pid, done=lambda r: r.get("videos") and durations(free_user, r) == [4.0])
    assert len(res["videos"]) == 1


@pytest.mark.tst("TST-STATUS-09")
def test_original_unchanged_after_processing(free_user):
    """O vídeo original mantém o mesmo SHA-256 depois de recortado, comprimido e extraído."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 0, "endTime": 6}, expect=201)
    free_user.add_tool(pid, "compress", {"videoId": vid, "level": "strong"}, expect=201)
    free_user.run(pid)
    (video,) = free_user.project(pid)["videos"]
    assert hashlib.sha256(free_user.download(video["url"])).hexdigest() == sha256_file(fixture("clip_h264.mp4"))


@pytest.mark.tst("TST-STATUS-10")
def test_results_need_permission(free_user, other_user):
    """Outro utilizador sem permissão não consegue consultar os resultados de um projeto."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 0, "endTime": 2}, expect=201)
    free_user.run(pid)
    r = other_user.http.get(f"{free_user._url('')}/{pid}/process/url")
    assert r.status_code in (401, 403)
