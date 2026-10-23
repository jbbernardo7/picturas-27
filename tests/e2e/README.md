# Testes ponta a ponta — funcionalidades de vídeo

Testes automáticos que exercitam o carregamento, o recorte, a compressão e a extração de
fotogramas através da aplicação completa, como o navegador: tudo passa por
`https://localhost:8080` (nginx → API Gateway → serviços → RabbitMQ → serviços de vídeo).

## Correr

1. Lançar a aplicação: `docker compose up -d --build` (na raiz do repositório).
2. Correr os testes:

   ```bash
   ./tests/e2e/run.sh                 # todos (cerca de 2 minutos)
   ./tests/e2e/run.sh -k extract      # só os de extração
   ```

   Na primeira execução é criado um ambiente virtual em `tests/e2e/.venv` com as dependências
   (`requirements.txt`). Requer Python 3.9+ e Bash (no Windows, Git Bash ou WSL; em alternativa,
   `python -m venv .venv`, `pip install -r requirements.txt` e `python -m pytest -v` dentro desta pasta).
3. O resultado fica em `tests/e2e/report.md`, uma tabela com o ID de cada teste do relatório
   (Capítulo 10), o resultado e a duração.

Cada execução cria utilizadores novos (Registado, Premium e Anónimo), por isso as quotas diárias
começam sempre a zero. Os projetos criados pelos testes ficam nesses utilizadores.

Variáveis de ambiente: `E2E_BASE_URL` (por omissão `https://localhost:8080`),
`E2E_FREE_DAILY_EXTRACT` (por omissão 5; deve coincidir com `FREE_DAILY_EXTRACT` do serviço `users`)
e `E2E_PROCESS_TIMEOUT` (segundos, por omissão 180).

## O que é testado

| Ficheiro | Funcionalidade |
|---|---|
| `test_upload.py` | UC-VID-001: tipos, conteúdo, codec, tamanho e duração; perfis; projeto oculto sem vídeos; integridade; acesso |
| `test_trim.py` | UC-VID-002: validação do intervalo, tipo de projeto, parâmetros guardados, duração do resultado |
| `test_compress.py` | UC-VID-004: níveis, Strong < Light, duração e áudio mantidos, WEBM → MP4 |
| `test_extract.py` | UC-VID-003: formato, intervalo, limites por perfil, destino novo/existente, último passo, quota diária |
| `test_chain_status.py` | Encadeamento por vídeo, quotas, todos os formatos aceites, substituição de resultados, original inalterado, permissões |

## Ficheiros de teste

Os vídeos estão em `fixtures/` (cerca de 1,2 MB) e foram gerados com `make_fixtures.sh`
(precisa de ffmpeg com libx264, libx265 e libvpx). Só é preciso voltar a gerá-los se mudarem.

## Como funciona

`client.py` é um cliente mínimo da API: regista utilizadores, carrega vídeos por partes (como o
_frontend_), grava ferramentas, aplica o processamento e espera pelos resultados, escutando as
notificações de erro pelo WebSocket. A duração, as pistas e as dimensões dos ficheiros
resultantes são lidas em Python, sem ffprobe.
