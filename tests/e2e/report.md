# Resultados dos testes ponta a ponta

- Data: 2026-10-23 18:04
- Alvo: https://localhost:8080
- Resultado: 40/40 testes passaram

| ID(s) | Teste | Descrição | Resultado | Duração (s) | Detalhe |
|---|---|---|---|---|---|
| TST-SUBMIT-02 | `test_chain_status.py::test_anonymous_cannot_use_video_tools` | Um anónimo não pode gravar as ferramentas de recorte nem de extração. | Passa | 0.2 |  |
| TST-SUBMIT-07, TST-SUBMIT-09 | `test_chain_status.py::test_tools_belong_to_one_video` | Cada ferramenta aplica-se a um vídeo; um 2.º recorte do mesmo vídeo é recusado; só os vídeos com ferramentas dão resultado. | Passa | 5.3 |  |
| TST-SUBMIT-08 | `test_chain_status.py::test_trim_then_compress` | Um recorte de 4 s seguido de compressão dá um único resultado com 4 s. | Passa | 4.0 |  |
| TST-SUBMIT-06 | `test_chain_status.py::test_trim_and_compress_do_not_use_daily_operations` | O recorte e a compressão não consomem as operações diárias do Registado. | Passa | 4.0 |  |
| TST-SUBMIT-10 | `test_chain_status.py::test_every_accepted_format_is_processed[clip_h264.mp4]` | Cada formato aceite (MP4, MOV, WEBM VP8 e VP9) passa por recorte, compressão e extração. | Passa | 6.2 |  |
| TST-SUBMIT-10 | `test_chain_status.py::test_every_accepted_format_is_processed[clip_h264.mov]` | Cada formato aceite (MP4, MOV, WEBM VP8 e VP9) passa por recorte, compressão e extração. | Passa | 5.8 |  |
| TST-SUBMIT-10 | `test_chain_status.py::test_every_accepted_format_is_processed[clip_vp8.webm]` | Cada formato aceite (MP4, MOV, WEBM VP8 e VP9) passa por recorte, compressão e extração. | Passa | 5.9 |  |
| TST-SUBMIT-10 | `test_chain_status.py::test_every_accepted_format_is_processed[clip_vp9.webm]` | Cada formato aceite (MP4, MOV, WEBM VP8 e VP9) passa por recorte, compressão e extração. | Passa | 5.8 |  |
| TST-STATUS-07 | `test_chain_status.py::test_new_run_replaces_results` | Uma nova execução substitui o resultado anterior (8 s → 4 s). | Passa | 5.2 |  |
| TST-STATUS-09 | `test_chain_status.py::test_original_unchanged_after_processing` | O vídeo original mantém o mesmo SHA-256 depois de recortado, comprimido e extraído. | Passa | 3.8 |  |
| TST-STATUS-10 | `test_chain_status.py::test_results_need_permission` | Outro utilizador sem permissão não consegue consultar os resultados de um projeto. | Passa | 3.8 |  |
| TST-COMP-01 | `test_compress.py::test_unknown_level_fails` | Um nível de compressão desconhecido termina com falha e indica os níveis válidos. | Passa | 1.7 |  |
| TST-COMP-02 | `test_compress.py::test_strong_is_smaller_than_light` | O mesmo vídeo comprimido com Strong fica mais pequeno do que com Light. | Passa | 6.6 |  |
| TST-COMP-03 | `test_compress.py::test_keeps_duration_and_audio` | O resultado mantém a duração (±0,1 s) e a pista de áudio. | Passa | 2.5 |  |
| TST-COMP-04 | `test_compress.py::test_webm_becomes_mp4` | Um vídeo WEBM comprimido dá um ficheiro MP4. | Passa | 2.5 |  |
| TST-EXT-02 | `test_extract.py::test_format_must_be_png_or_jpeg` | O formato de saída tem de ser PNG ou JPEG; JPEG fica registado e GIF é recusado. | Passa | 0.7 |  |
| TST-EXT-03 | `test_extract.py::test_interval_checks` | Um intervalo vazio é recusado; com um recorte de 10 s, um fim em 11 s também é recusado. | Passa | 0.6 |  |
| TST-EXT-04 | `test_extract.py::test_frame_count_limits` | O número de fotogramas tem de ser um inteiro entre 1 e 10 (Registado) ou 20 (Premium). | Passa | 1.1 |  |
| TST-EXT-05, TST-EXT-07, TST-EXT-13 | `test_extract.py::test_extract_to_new_project` | 0–10 s com 5 fotogramas cria um projeto de imagem com 5 imagens, ordenadas, com o instante no nome. | Passa | 7.1 |  |
| TST-EXT-08 | `test_extract.py::test_extract_to_existing_project` | Duas extrações para um projeto de imagem existente acrescentam imagens sem colisões de nomes. | Passa | 8.7 |  |
| TST-EXT-09 | `test_extract.py::test_destination_must_be_own_image_project` | O destino não pode ser um projeto de vídeo nem um projeto de outro utilizador. | Passa | 0.6 |  |
| TST-EXT-10 | `test_extract.py::test_extraction_is_last_step` | Depois da extração não se pode acrescentar outra ferramenta ao mesmo vídeo nem reordenar para a tirar do fim. | Passa | 0.6 |  |
| TST-EXT-11, TST-EXT-12 | `test_extract.py::test_daily_extraction_quota` | Cada extração concluída conta 1; depois de 5 no dia, um Registado não consegue iniciar outra. | Passa | 25.8 |  |
| TST-TRIM-02, TST-SUBMIT-04 | `test_trim.py::test_start_not_before_end_rejected` | Um recorte com início ≥ fim é recusado com a mensagem correspondente. | Passa | 1.0 |  |
| TST-TRIM-03 | `test_trim.py::test_interval_outside_duration_rejected` | Um recorte com o fim depois da duração do vídeo (12 s) é recusado. | Passa | 0.5 |  |
| TST-TRIM-04 | `test_trim.py::test_tools_follow_project_type` | O recorte é recusado num projeto de imagem e uma ferramenta de imagem é recusada num projeto de vídeo. | Passa | 0.5 |  |
| TST-TRIM-05 | `test_trim.py::test_trim_saved_with_parameters` | O recorte gravado fica na lista de ferramentas com os instantes e o vídeo. | Passa | 0.4 |  |
| TST-TRIM-06, TST-STATUS-06 | `test_trim.py::test_trim_result` | Aplicar o recorte de 2 a 10 s gera um MP4 de 8 s, com áudio, nos resultados; o original fica no projeto. | Passa | 6.6 |  |
| TST-UPLOAD-02 | `test_upload.py::test_create_video_project_with_two_videos` | Um Registado cria um projeto de vídeo com 2 vídeos e ambos ficam no projeto. | Passa | 1.0 |  |
| TST-UPLOAD-04 | `test_upload.py::test_anonymous_cannot_create_video_project` | Um anónimo não pode criar projetos de vídeo (mensagem do perfil). | Passa | 0.1 |  |
| TST-UPLOAD-06 | `test_upload.py::test_image_rejected_in_video_project` | Uma imagem enviada para um projeto de vídeo é recusada com «Invalid project type». | Passa | 0.4 |  |
| TST-UPLOAD-07 | `test_upload.py::test_unsupported_type_rejected` | Um tipo de ficheiro não suportado (AVI) é recusado com «Invalid file type!» e a lista de formatos. | Passa | 0.1 |  |
| TST-UPLOAD-08 | `test_upload.py::test_fake_content_rejected` | Um ficheiro de texto com extensão .mp4 é recusado com «Invalid file content!». | Passa | 0.2 |  |
| TST-UPLOAD-09 | `test_upload.py::test_codec_check` | Um MP4 em H.265 é recusado com «Invalid video codec!»; um WEBM em VP9 é aceite. | Passa | 0.6 |  |
| TST-UPLOAD-10 | `test_upload.py::test_size_limit` | Um vídeo de 501 MB é recusado com a mensagem de tamanho; 500 MB é aceite no início do envio. | Passa | 0.1 |  |
| TST-UPLOAD-11 | `test_upload.py::test_duration_limit` | Um vídeo com 10 min 01 s é recusado com a mensagem de duração. | Passa | 0.3 |  |
| TST-UPLOAD-12 | `test_upload.py::test_invalid_file_does_not_affect_others` | Numa submissão com 1 ficheiro inválido, os 2 válidos ficam no projeto e o inválido não. | Passa | 1.0 |  |
| TST-UPLOAD-16 | `test_upload.py::test_project_without_videos_is_hidden` | Um projeto de vídeo sem nenhum vídeo carregado não aparece na biblioteca. | Passa | 0.4 |  |
| TST-UPLOAD-18 | `test_upload.py::test_stored_video_is_identical` | O vídeo guardado é idêntico ao original (mesmo SHA-256). | Passa | 0.3 |  |
| TST-UPLOAD-19 | `test_upload.py::test_other_user_cannot_access` | Outro utilizador, sem ligação de partilha, não consegue obter o projeto nem iniciar envios. | Passa | 0.3 |  |
