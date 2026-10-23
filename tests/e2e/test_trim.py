"""UC-VID-002 — Recortar intervalo temporal."""
import pytest

from client import mp4_info


@pytest.mark.tst("TST-TRIM-02", "TST-SUBMIT-04")
def test_start_not_before_end_rejected(free_user):
    """Um recorte com início ≥ fim é recusado com a mensagem correspondente."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    r = free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 5, "endTime": 5})
    assert r.status_code == 400
    assert "Start time must be lower than end time." in r.text
    assert free_user.tools(pid) == []


@pytest.mark.tst("TST-TRIM-03")
def test_interval_outside_duration_rejected(free_user):
    """Um recorte com o fim depois da duração do vídeo (12 s) é recusado."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    r = free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 2, "endTime": 13})
    assert r.status_code == 400
    assert "inside the video duration" in r.text


@pytest.mark.tst("TST-TRIM-04")
def test_tools_follow_project_type(free_user):
    """O recorte é recusado num projeto de imagem e uma ferramenta de imagem é recusada num projeto de vídeo."""
    img = free_user.create_project("image")["_id"]
    r = free_user.add_tool(img, "trim", {"videoId": "x", "startTime": 0, "endTime": 1})
    assert r.status_code == 400
    pid, _ = free_user.video_project("clip_h264.mp4")
    r = free_user.add_tool(pid, "brightness", {"brightness": 1.2})
    assert r.status_code == 400


@pytest.mark.tst("TST-TRIM-05")
def test_trim_saved_with_parameters(free_user):
    """O recorte gravado fica na lista de ferramentas com os instantes e o vídeo."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 2, "endTime": 10}, expect=201)
    (tool,) = free_user.tools(pid)
    assert tool["procedure"] == "trim"
    assert tool["params"] == {"videoId": vid, "startTime": 2, "endTime": 10}


@pytest.mark.tst("TST-TRIM-06", "TST-STATUS-06")
def test_trim_result(free_user):
    """Aplicar o recorte de 2 a 10 s gera um MP4 de 8 s, com áudio, nos resultados; o original fica no projeto."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    free_user.add_tool(pid, "trim", {"videoId": vid, "startTime": 2, "endTime": 10}, expect=201)
    res = free_user.run(pid)
    (video,) = res["videos"]
    info = mp4_info(free_user.download(video["url"]))
    assert abs(info["duration"] - 8) < 0.2
    assert "soun" in info["tracks"]
    assert [v["_id"] for v in free_user.project(pid)["videos"]] == [vid]
