"""UC-VID-001 — Carregar vídeos."""
import os

import pytest

from client import fixture, sha256_file

MB = 1024 * 1024


@pytest.mark.tst("TST-UPLOAD-02")
def test_create_video_project_with_two_videos(free_user):
    """Um Registado cria um projeto de vídeo com 2 vídeos e ambos ficam no projeto."""
    pid, vids = free_user.video_project("clip_h264.mp4", "clip_vp9.webm")
    p = free_user.project(pid)
    assert p["type"] == "video"
    assert sorted(v["_id"] for v in p["videos"]) == sorted(vids)
    assert all(v["duration"] > 11 for v in p["videos"])


@pytest.mark.tst("TST-UPLOAD-04")
def test_anonymous_cannot_create_video_project(anon_user):
    """Um anónimo não pode criar projetos de vídeo (mensagem do perfil)."""
    r = anon_user.create_project("video", expect=None)
    assert r.status_code == 403
    assert "Only premium/registered users can upload videos!" in r.text


@pytest.mark.tst("TST-UPLOAD-06")
def test_image_rejected_in_video_project(free_user):
    """Uma imagem enviada para um projeto de vídeo é recusada com «Invalid project type»."""
    pid, _ = free_user.video_project("clip_h264.mp4")
    r = free_user.add_image(pid, fixture("photo.png"))
    assert r.status_code == 400
    assert "Invalid project type" in r.text
    assert free_user.project(pid)["imgs"] == []


@pytest.mark.tst("TST-UPLOAD-07")
def test_unsupported_type_rejected(free_user):
    """Um tipo de ficheiro não suportado (AVI) é recusado com «Invalid file type!» e a lista de formatos."""
    pid = free_user.create_project("video")["_id"]
    r = free_user.init_upload(pid, "video/x-msvideo", 1000)
    assert r.status_code == 415
    assert "Invalid file type!" in r.text and "MP4, WEBM, MOV" in r.text


@pytest.mark.tst("TST-UPLOAD-08")
def test_fake_content_rejected(free_user):
    """Um ficheiro de texto com extensão .mp4 é recusado com «Invalid file content!»."""
    pid = free_user.create_project("video")["_id"]
    with pytest.raises(Exception) as e:
        free_user.upload_video(pid, fixture("fake.mp4"))
    assert getattr(e.value, "status", None) == 422
    assert "Invalid file content!" in e.value.text


@pytest.mark.tst("TST-UPLOAD-09")
def test_codec_check(free_user):
    """Um MP4 em H.265 é recusado com «Invalid video codec!»; um WEBM em VP9 é aceite."""
    pid = free_user.create_project("video")["_id"]
    with pytest.raises(Exception) as e:
        free_user.upload_video(pid, fixture("clip_hevc.mp4"))
    assert getattr(e.value, "status", None) == 422
    assert "Invalid video codec!" in e.value.text
    ok = free_user.upload_video(pid, fixture("clip_vp9.webm"))
    assert ok["status"] == "ready"


@pytest.mark.tst("TST-UPLOAD-10")
def test_size_limit(free_user):
    """Um vídeo de 501 MB é recusado com a mensagem de tamanho; 500 MB é aceite no início do envio."""
    pid = free_user.create_project("video")["_id"]
    r = free_user.init_upload(pid, "video/mp4", 501 * MB)
    assert r.status_code == 413
    assert "maximum allowed size" in r.text and "500 MB" in r.text
    ok = free_user.init_upload(pid, "video/mp4", 500 * MB)
    assert ok.status_code == 200
    free_user.abort_upload(pid, ok.json())


@pytest.mark.tst("TST-UPLOAD-11")
def test_duration_limit(free_user):
    """Um vídeo com 10 min 01 s é recusado com a mensagem de duração."""
    pid = free_user.create_project("video")["_id"]
    with pytest.raises(Exception) as e:
        free_user.upload_video(pid, fixture("long_601s.mp4"))
    assert getattr(e.value, "status", None) == 422
    assert "maximum allowed duration" in e.value.text and "10 minutes" in e.value.text


@pytest.mark.tst("TST-UPLOAD-12")
def test_invalid_file_does_not_affect_others(free_user):
    """Numa submissão com 1 ficheiro inválido, os 2 válidos ficam no projeto e o inválido não."""
    pid = free_user.create_project("video")["_id"]
    free_user.upload_video(pid, fixture("clip_h264.mp4"))
    with pytest.raises(Exception):
        free_user.upload_video(pid, fixture("fake.mp4"))
    free_user.upload_video(pid, fixture("clip_h264.mov"))
    names = sorted(v["name"] for v in free_user.project(pid)["videos"])
    assert names == ["clip_h264.mov", "clip_h264.mp4"]


@pytest.mark.tst("TST-UPLOAD-16")
def test_project_without_videos_is_hidden(free_user):
    """Um projeto de vídeo sem nenhum vídeo carregado não aparece na biblioteca."""
    pid = free_user.create_project("video")["_id"]
    assert pid not in [p["_id"] for p in free_user.list_projects()]
    free_user.upload_video(pid, fixture("clip_h264.mp4"))
    assert pid in [p["_id"] for p in free_user.list_projects()]


@pytest.mark.tst("TST-UPLOAD-18")
def test_stored_video_is_identical(free_user):
    """O vídeo guardado é idêntico ao original (mesmo SHA-256)."""
    pid, _ = free_user.video_project("clip_h264.mp4")
    video = free_user.project(pid)["videos"][0]
    import hashlib
    assert hashlib.sha256(free_user.download(video["url"])).hexdigest() == sha256_file(fixture("clip_h264.mp4"))


@pytest.mark.tst("TST-UPLOAD-19")
def test_other_user_cannot_access(free_user, other_user):
    """Outro utilizador, sem ligação de partilha, não consegue obter o projeto nem iniciar envios."""
    pid, _ = free_user.video_project("clip_h264.mp4")
    r = other_user.http.get(f"{free_user._url('')}/{pid}")
    assert r.status_code in (401, 403)
    r = other_user.http.post(f"{free_user._url('')}/{pid}/video/init", json={"contentType": "video/mp4", "size": 10})
    assert r.status_code in (401, 403)
