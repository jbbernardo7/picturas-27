"""UC-VID-004 — Comprimir vídeo."""
import pytest

from client import ProcessFailed, mp4_info


def _compress(user, fixture_name, level):
    pid, (vid,) = user.video_project(fixture_name)
    user.add_tool(pid, "compress", {"videoId": vid, "level": level}, expect=201)
    res = user.run(pid)
    return user.download(res["videos"][0]["url"])


@pytest.mark.tst("TST-COMP-01")
def test_unknown_level_fails(free_user):
    """Um nível de compressão desconhecido termina com falha e indica os níveis válidos."""
    pid, (vid,) = free_user.video_project("clip_h264.mp4")
    free_user.add_tool(pid, "compress", {"videoId": vid, "level": "ultra"}, expect=201)
    with pytest.raises(ProcessFailed) as e:
        free_user.run(pid, timeout=60)
    assert "light" in str(e.value) and "strong" in str(e.value)


@pytest.mark.tst("TST-COMP-02")
def test_strong_is_smaller_than_light(free_user):
    """O mesmo vídeo comprimido com Strong fica mais pequeno do que com Light."""
    light = _compress(free_user, "clip_h264.mp4", "light")
    strong = _compress(free_user, "clip_h264.mp4", "strong")
    assert len(strong) < len(light)


@pytest.mark.tst("TST-COMP-03")
def test_keeps_duration_and_audio(free_user):
    """O resultado mantém a duração (±0,1 s) e a pista de áudio."""
    info = mp4_info(_compress(free_user, "clip_h264.mp4", "medium"))
    assert abs(info["duration"] - 12) < 0.1
    assert "soun" in info["tracks"] and "vide" in info["tracks"]


@pytest.mark.tst("TST-COMP-04")
def test_webm_becomes_mp4(free_user):
    """Um vídeo WEBM comprimido dá um ficheiro MP4."""
    info = mp4_info(_compress(free_user, "clip_vp9.webm", "medium"))
    assert info["brand"] in ("isom", "mp42", "mp41", "iso5")
    assert abs(info["duration"] - 12) < 0.2
