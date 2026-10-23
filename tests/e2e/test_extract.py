"""UC-VID-003 — Extrair fotogramas de um vídeo."""
import os
import re

import pytest

from client import image_size

EXTRACT_LIMIT = int(os.environ.get("E2E_FREE_DAILY_EXTRACT", "5"))


def extract(vid, start=0, end=10, count=5, fmt="png", dest=None):
    return {"videoId": vid, "startTime": start, "endTime": end, "count": count, "format": fmt,
            "destination": dest or {"mode": "new", "name": "e2e frames"}}


def frames_done(res):
    return len(res.get("frames", [])) > 0


@pytest.mark.tst("TST-EXT-02")
def test_format_must_be_png_or_jpeg(free_user):
    """O formato de saída tem de ser PNG ou JPEG; JPEG fica registado e GIF é recusado."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    r = free_user.add_tool(pid, "extract_frames", extract(vid, fmt="gif"))
    assert r.status_code == 400 and "PNG or JPEG" in r.text
    free_user.add_tool(pid, "extract_frames", extract(vid, count=3, fmt="jpeg"), expect=201)
    (tool,) = free_user.tools(pid)
    assert tool["params"]["format"] == "jpeg" and tool["params"]["count"] == 3


@pytest.mark.tst("TST-EXT-03")
def test_interval_checks(free_user):
    """Um intervalo vazio é recusado; com um recorte de 10 s, um fim em 11 s também é recusado."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    r = free_user.add_tool(pid, "extract_frames", extract(vid, start=5, end=5))
    assert r.status_code == 400
    free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 0, "endTime": 10}, expect=201)
    r = free_user.add_tool(pid, "extract_frames", extract(vid, start=0, end=11))
    assert r.status_code == 400 and "10.00s" in r.text


@pytest.mark.tst("TST-EXT-04")
def test_frame_count_limits(free_user, premium_user):
    """O número de fotogramas tem de ser um inteiro entre 1 e 10 (Registado) ou 20 (Premium)."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    for bad in (0, 2.5, 11):
        r = free_user.add_tool(pid, "extract_frames", extract(vid, count=bad))
        assert r.status_code == 400, bad
    assert "up to 10" in r.text
    ppid, (pvid,) = premium_user.video_project("clip_h264.mp4")
    r = premium_user.add_tool(ppid, "extract_frames", extract(pvid, count=21))
    assert r.status_code == 400 and "up to 20" in r.text
    premium_user.add_tool(ppid, "extract_frames", extract(pvid, count=20), expect=201)


@pytest.mark.tst("TST-EXT-05", "TST-EXT-07", "TST-EXT-13")
def test_extract_to_new_project(premium_user):
    """0–10 s com 5 fotogramas cria um projeto de imagem com 5 imagens, ordenadas, com o instante no nome."""
    pid, (vid,) = premium_user.video_project("clip_h264.mp4")
    premium_user.add_tool(pid, "extract_frames", extract(vid, dest={"mode": "new", "name": "e2e new"}),
                          expect=201)
    res = premium_user.run(pid, done=frames_done)
    (frames,) = res["frames"]
    assert frames["count"] == 5 and frames["project_name"] == "e2e new"
    assert res["videos"] == []

    dest = premium_user.project(frames["project_id"])
    assert dest["type"] == "image"
    names = [i["name"] for i in dest["imgs"]]
    times = [re.search(r"_(\d{2})-(\d{2})-(\d{3})\.png$", n).groups() for n in names]
    secs = [int(m) * 60 + int(s) + int(ms) / 1000 for m, s, ms in times]
    assert secs == [0, 2, 4, 6, 8]
    w, h, fmt = image_size(premium_user.download(dest["imgs"][0]["url"]))
    assert (w, h, fmt) == (320, 240, "png")

    # the video project gets no images, and the new project shows up in the library
    assert premium_user.project(pid)["imgs"] == []
    assert frames["project_id"] in [p["_id"] for p in premium_user.list_projects()]

    # the frames are ordinary images: an image tool can be added to their project
    premium_user.add_tool(frames["project_id"], "brightness", {"brightness": 1.2}, expect=201)


@pytest.mark.tst("TST-EXT-08")
def test_extract_to_existing_project(premium_user):
    """Duas extrações para um projeto de imagem existente acrescentam imagens sem colisões de nomes."""
    dest = premium_user.create_project("image")["_id"]
    pid, (vid,) = premium_user.video_project("clip_h264.mp4")
    premium_user.add_tool(pid, "extract_frames",
                          extract(vid, count=3, dest={"mode": "existing", "projectId": dest}), expect=201)
    premium_user.run(pid, done=frames_done)
    assert len(premium_user.project(dest)["imgs"]) == 3

    tool = premium_user.tools(pid)[0]
    premium_user.update_tool(pid, tool["_id"], extract(vid, count=2, dest={"mode": "existing", "projectId": dest}),
                             expect=204)
    premium_user.run(pid, done=lambda res: len(premium_user.project(dest)["imgs"]) == 5)
    names = [i["name"] for i in premium_user.project(dest)["imgs"]]
    assert len(names) == len(set(names)) == 5


@pytest.mark.tst("TST-EXT-09")
def test_destination_must_be_own_image_project(free_user, other_user):
    """O destino não pode ser um projeto de vídeo nem um projeto de outro utilizador."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    r = free_user.add_tool(pid, "extract_frames", extract(vid, dest={"mode": "existing", "projectId": pid}))
    assert r.status_code == 400 and "image project" in r.text
    foreign = other_user.create_project("image")["_id"]
    r = free_user.add_tool(pid, "extract_frames", extract(vid, dest={"mode": "existing", "projectId": foreign}))
    assert r.status_code == 400


@pytest.mark.tst("TST-EXT-10")
def test_extraction_is_last_step(free_user):
    """Depois da extração não se pode acrescentar outra ferramenta ao mesmo vídeo nem reordenar para a tirar do fim."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 0, "endTime": 8}, expect=201)
    free_user.add_tool(pid, "extract_frames", extract(vid, end=8), expect=201)
    r = free_user.add_tool(pid, "compress", {"videoId": vid, "level": "medium"})
    assert r.status_code == 400 and "last step" in r.text
    trim, ext = free_user.tools(pid)
    r = free_user.reorder(pid, [ext, trim])
    assert r.status_code == 400 and "last step" in r.text


@pytest.mark.tst("TST-EXT-11", "TST-EXT-12")
def test_daily_extraction_quota(fresh_free_user):
    """Cada extração concluída conta 1; depois de 5 no dia, um Registado não consegue iniciar outra."""
    u = fresh_free_user
    pid, (vid,) = u.video_project("clip_h264.mp4")
    u.add_tool(pid, "extract_frames", extract(vid, count=1), expect=201)
    tool_id = u.tools(pid)[0]["_id"]
    seen = set()
    for n in range(1, EXTRACT_LIMIT + 1):
        if n > 1:  # change the parameters, otherwise an unchanged project is not processed again
            u.update_tool(pid, tool_id, extract(vid, count=n), expect=204)
        res = u.run(pid, done=lambda r: r.get("frames") and r["frames"][0]["project_id"] not in seen)
        seen.add(res["frames"][0]["project_id"])
        assert res["frames"][0]["count"] == n
    u.update_tool(pid, tool_id, extract(vid, count=EXTRACT_LIMIT + 1), expect=204)
    r = u.process(pid)
    assert r.status_code == 429
    assert "daily limit" in r.text
