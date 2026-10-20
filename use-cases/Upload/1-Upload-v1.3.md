# 📝 Exercício 1 — Template de Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS


---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | Grupo 6 - PL5 |
| **Autores** | João Bernardo (pg65418) |
| **Data** | 2026-10-19 |
| **Versão do documento** | v1.3 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Carregamento de Vídeos (Upload) |
| **Perfil(s) de utilizador abrangido(s)** | Registado e Premium. O armazenamento e processamento de vídeos exigem mais recursos quando comparado com imagens. Por isso, o carregamento de vídeos é limitado a perfis registados e premium. |

**Justificação no contexto do MVP** *(2–3 linhas)*

O carregamento de vídeos é a funcionalidade base do suporte a vídeo: todas as restantes (por exemplo: recortar, aplicar filtros, etc...) dependem de um vídeo já disponível na biblioteca do utilizador. Sem ela, não é possível utilizar nem validar nenhuma operação do suporte a vídeo. Implementá-la obriga a tomar decisões relacionadas com os formatos e limites aceites.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Carregamento de vídeos |
| **Versão** | v1.3 |
| **Autor** | João Bernardo |
| **Data** | 2026-10-19 |
| **Objetivo** | Permite ao utilizador carregar um ou mais vídeos para um projeto de vídeo, de modo a poder aplicar operações de edição posteriormente. |
| **Âmbito** | Módulo de vídeo do PictuRAS - carregamento de ficheiros |
| **Ator Principal** | Utilizador registado ou premium |
| **Stakeholders e Interesses** | - **Utilizador**: quer submeter os seus vídeos de forma fiável, incluindo os motivos de uma eventual recusa<br>- **Proprietário do Sistema**: Pretende controlar o custo de armazenamento e processamento<br>- **Equipa de Desenvolvimento:** Valida o armazenamento e a gestão de ficheiros grandes |
| **Pré-condições** | - O utilizador tem sessão iniciada<br> - Quando o carregamento é feito para um projeto existente, esse projeto contém apenas vídeos |
| **Trigger** | O utilizador inicia o carregamento de um ou mais vídeos através de uma zona de drag and drop na biblioteca, num novo projeto (do tipo Vídeo) ou num projeto existente |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a biblioteca | Apresenta a listagem de projetos |
| 2 | O utilizador seleciona 'New Project' | Apresenta uma caixa para definir o nome do projeto, um seletor do tipo de projeto (Imagem ou Vídeo) e uma zona de *drag and drop* para submissão de ficheiros |
| 3 | O utilizador define o nome, seleciona o tipo de projeto 'Vídeo' e arrasta ou seleciona os ficheiros para carregamento na zona de *drag and drop*, e submete a criação do projeto | Verifica que os ficheiros correspondem ao tipo de projeto selecionado (se incluírem tipos diferentes, avisa o utilizador antes de criar o projeto - ver E7) e valida cada vídeo quanto ao formato, conteúdo, codec, tamanho e duração |
| 4 | - | Inicia, em paralelo, o carregamento dos vídeos que passaram a verificação e apresenta, para cada ficheiro, o nome, o estado (In queue, Processing, Done, Fail) e uma barra de progresso com a percentagem de carregamento |
| 5 | - | Atualiza a barra e a percentagem de cada ficheiro pelo menos 1 vez por segundo e, quando termina, apresenta o estado de cada. |
| 6 | - | Se pelo menos um vídeo foi carregado com sucesso, cria o projeto e associa-lhe esses vídeos |
| 7 | - | Abre e apresenta o projeto |


### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 - Upload através de biblioteca | O utilizador arrasta um ou mais vídeos para a zona de drag and drop da biblioteca → o sistema apresenta a interface para definir o nome e o tipo do projeto → após o utilizador definir o nome, selecionar o tipo e submeter a criação do projeto, o sistema valida os ficheiros → o fluxo continua no passo 4. |
| FA2 - Adicionar vídeo a projeto existente | O utilizador abre um projeto de vídeo e seleciona Add Video → arrasta ou seleciona um ou mais vídeos → o sistema verifica que os ficheiros correspondem ao tipo do projeto e valida cada vídeo quanto ao formato, conteúdo, codec, tamanho e duração → o fluxo continua nos passos 4 e 5 → após o carregamento, associa os vídeos carregados com sucesso ao projeto existente |
| FA3 - Cancelar carregamento | Durante os passos 4 e 5, o utilizador cancela o carregamento de um ficheiro → o sistema interrompe o carregamento, descarta o ficheiro e remove os dados parciais → os restantes ficheiros seguem normalmente → o fluxo continua no passo 5. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| E1 - Utilizador sem perfil registado ou premium tenta carregar vídeos | Apresenta o erro "Only premium/registered users can upload videos!", sem validar nem carregar qualquer ficheiro (verificação anterior à validação dos ficheiros). |
| E2 - Formato não suportado | Apresenta o erro "Invalid file type!", indica os formatos aceites e descarta o ficheiro; os restantes seguem normalmente. |
| E3 - Tamanho excede o limite do sistema | Apresenta o erro "File exceeds the maximum allowed size", indica o tamanho máximo e descarta o ficheiro; os restantes seguem normalmente. |
| E4 - Duração excede o limite do sistema | Apresenta o erro "File exceeds the maximum allowed duration", indica a duração máxima e descarta o ficheiro; os restantes seguem normalmente. |
| E5 - Falha a meio do carregamento | Interrompe a barra de progresso do ficheiro, apresenta o estado Fail com o erro "Failed upload." e descarta o ficheiro, sem o retomar; os restantes seguem normalmente e os já carregados com sucesso mantêm-se. |
| E6 - Nenhum ficheiro é carregado com sucesso | Apresenta a mensagem "No files were uploaded." e não cria novo projeto |
| E7 - Ficheiros incompatíveis com tipo de projeto | **Na criação de um projeto:** quando os ficheiros submetidos incluem tipos diferentes do tipo de projeto selecionado, avisa o utilizador antes de criar o projeto; o utilizador pode corrigir o tipo de projeto ou cancelar, e o projeto só é criado depois disso. **Num projeto existente:** mantém o comportamento já existente para Imagens: apresenta o erro "Invalid project type", indica que os ficheiros não correspondem ao tipo de projeto e descarta o ficheiro; os restantes seguem normalmente. |
| E8 - Conteúdo do ficheiro não corresponde ao formato indicado pela extensão | Apresenta o erro "Invalid file content!" e descarta o ficheiro; os restantes seguem normalmente. |
| E9 - Codec de vídeo não suportado | Apresenta o erro "Invalid video codec!" e descarta o ficheiro; os restantes seguem normalmente. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | Todos os vídeos que passaram a verificação e foram carregados com sucesso ficam associados ao projeto, com o conteúdo original inalterado, e disponíveis para operações de edição de vídeo |
| Garantia Mínima | Nenhum ficheiro rejeitado ou cujo carregamento tenha falhado fica associado ao projeto; dados parciais não ficam armazenados; os vídeos carregados com sucesso mantêm-se disponíveis; quando nenhum ficheiro é carregado com sucesso, o novo projeto não é criado; o utilizador é informado dos eventuais erros. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | O carregamento de vídeos só está disponível para utilizadores registados e premium |
| RN2 | O carregamento de vídeos não é contabilizado como uma das 5 operações diárias para utilizadores registados nem em qualquer outra quota |
| RN3 | Um utilizador pode carregar um ou mais vídeos numa única operação. |
| RN4 | Os ficheiros válidos e carregados com sucesso são adicionados ao projeto; os ficheiros rejeitados ou cujo carregamento falhe não são associados ao projeto e não interrompem o carregamento dos restantes ficheiros. |
| RN5 | Apenas os vídeos em formato MP4, WEBM ou MOV; com codec H.264 (MP4 e MOV) ou VP8/VP9 (WebM); com tamanho até 500 MB e duração até 10 minutos, podem ser carregados. |
| RN6 | Um novo projeto só é criado quando pelo menos um ficheiro é carregado com sucesso. |
| RN7 | Um projeto contém apenas imagens ou apenas vídeos. O tipo do projeto é definido na criação do projeto e não pode ser alterado. |
| RN8 | No diálogo de criação de projeto está sempre selecionado um único tipo de projeto (Imagem ou Vídeo), sendo 'Imagem' o tipo por defeito. |
| RN9 | O ficheiro de vídeo carregado é guardado sem alterações ao conteúdo original. |
| RN10 | Os vídeos válidos de uma mesma submissão são carregados em paralelo. |

### 2.7 Assunções


| **ID** | **Assunção** |
|--------|--------------|
| A1 | As zonas de drag and drop já existem na plataforma (permitem arrastar ou selecionar ficheiros) e são reutilizadas para este caso de uso |
| A2 | O botão *Add Image* já existente mantém-se inalterado; os projetos de vídeo apresentam o botão *Add Video* em vez de *Add Image*. |
| A3 | Um carregamento que falhe não é retomado, o utilizador tem de voltar a submeter o ficheiro |
| A4 | Não existe limite para o número de vídeos carregados numa operação, nem por projeto. |
| A5 | Os limites de tamanhos, formato e duração máxima não diferem de acordo com o perfil (registado/premium). |
| A6 | O carregamento de vídeos através de ficheiro .zip funciona do mesmo modo que a submissão de imagens já existente; cada vídeo dentro do .zip é validado individualmente (formato, conteúdo, codec, tamanho e duração) e os ficheiros inválidos são ignorados. |
| A7 | O carregamento de vídeos é feito apenas pelo dono do projeto; a partilha por link e a edição simultânea não são consideradas nesta fase. |
| A8 | A resolução dos vídeos não é limitada no MVP; o limite de tamanho protege o sistema. |
| A9 | Os vídeos não expiram e, no MVP, ficam fora dos backups automáticos, que cobrem apenas as bases de dados. |
| A10 | Os valores dos alvos de qualidade (60 s para a limpeza após falha no MVP; 3 tentativas de retoma e 15 min de expiração de endereços como alvos de produção) são decisões da equipa, fixadas sem medição prévia na infraestrutura do PictuRAS; a validar na implementação. |
| A11 | O acesso aos vídeos carregados reutiliza a autenticação já existente no PictuRAS; no MVP, só o proprietário do projeto acede aos vídeos (decorre de A7). |

### 2.8 Questões em Aberto

Sem questões em aberto.


---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| ChatGPT | Apoio na estruturação e revisão do caso de uso | Revisão manual do conteúdo pela equipa, verificando o alinhamento com o enunciado, o template e as regras do PictuRAS |
| Claude (Anthropic) | Revisão do caso de uso, apoio na elaboração do esboço de requisitos e na ERS. | Revisão manual pela equipa e verificação da cobertura entre o caso de uso, os requisitos e as decisões de qualidade; valores dos alvos de qualidade decididos pela equipa |

---

## ✅ Lista de verificação antes de entregar (Exercício 1)

- [ ] Secções 0 a 3 preenchidas e texto de ajuda (`>` e `{…}`) removido.
- [ ] Funcionalidade de vídeo escolhida **e justificada** no contexto do MVP.
- [ ] Ator principal identificado, com o respetivo perfil.
- [ ] Caso de uso com fluxo principal, **≥1 fluxo alternativo** e **≥1 exceção específica de vídeo**.
- [ ] Pós-condições com garantia de sucesso **e** garantia mínima.
- [ ] Regras de negócio e restrições preenchidas.
- [ ] Assunções e questões em aberto registadas.
- [ ] Utilização de agentes de IA documentada.

---
---

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** UC-VID-001 — Carregamento de vídeos
**Versão do dossiê:** v1.3
**Baseline do Exercício 1:** documento v1.2

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
|--------|---------------|----------------|--------------|--------------|--------------------------------|-----------------|----------------------------------------|
| REQ-VID-UPLOAD-001 | O sistema deve permitir ao utilizador escolher o tipo do projeto (Imagem ou Vídeo) no diálogo de criação de projeto, tendo sempre exatamente um tipo selecionado e 'Imagem' por defeito. | Deve ter | Mantido | ALT | UC-VID-001, Passo 2, Passo 3, RN8 | Permite criar projetos de vídeo sem alterar a criação de projetos de imagem. | Dado o diálogo 'New Project' aberto, então 'Imagem' está selecionado; ao selecionar 'Vídeo', fica selecionado apenas 'Vídeo' (nunca nenhum tipo nem os dois). |
| REQ-VID-UPLOAD-002 | O sistema deve permitir ao utilizador registado ou premium submeter um ou mais vídeos na criação de um projeto do tipo Vídeo, através da zona de *drag and drop* do diálogo 'New Project' ou da biblioteca. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 2, Passo 3, FA1, RN3 | Porta de entrada de toda a funcionalidade de vídeo. | Dado um utilizador registado, quando arrasta 2 vídeos válidos para o diálogo 'New Project' (ou para a biblioteca e depois define o nome e o tipo 'Vídeo') e submete, então os 2 ficheiros seguem para validação e carregamento. |
| REQ-VID-UPLOAD-003 | O sistema deve permitir ao utilizador registado ou premium adicionar um ou mais vídeos a um projeto de vídeo existente através do botão 'Add Video', apresentado em vez de 'Add Image' nos projetos de vídeo. | Deve ter | Mantido | NOVO | UC-VID-001, FA2, RN3, A2 | Permite acrescentar vídeos a projetos já criados, mantendo 'Add Image' inalterado nos projetos de imagem. | Dado um projeto de vídeo aberto, então vejo 'Add Video' e não 'Add Image'; quando adiciono 2 vídeos válidos, então ficam associados a esse projeto. |
| REQ-VID-UPLOAD-004 | O sistema deve permitir o carregamento de vídeos apenas a utilizadores registados ou premium, apresentando 'Only premium/registered users can upload videos!' a qualquer outro utilizador, sem validar nem carregar ficheiros. | Deve ter | Mantido (passa de NF no Exercício 1 a funcional: é a regra de negócio RN1) | ALT | UC-VID-001, E1, RN1 | Protege o armazenamento e o processamento, mais exigentes para vídeo, e sustenta o modelo de perfis. | Dado um utilizador sem perfil registado nem premium, quando tenta carregar um vídeo, então vê a mensagem indicada e nenhum ficheiro é validado nem carregado. |
| REQ-VID-UPLOAD-005 | O sistema deve avisar o utilizador, antes de criar o projeto, quando os ficheiros submetidos incluírem tipos diferentes do tipo de projeto selecionado, permitindo-lhe corrigir o tipo ou cancelar. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 3, E7 | Evita criar um projeto com o tipo errado; o utilizador corrige antes de o projeto existir. | Dado o tipo 'Vídeo' selecionado e uma submissão com 1 vídeo e 1 imagem, quando submete a criação, então é avisado e nenhum projeto é criado até corrigir o tipo ou cancelar. |
| REQ-VID-UPLOAD-006 | O sistema deve rejeitar, com o erro 'Invalid project type', cada ficheiro cujo tipo não corresponda ao tipo do projeto existente ao qual está a ser adicionado. | Deve ter | Mantido | ALT | UC-VID-001, FA2, E7, RN7, Pré-condições | Garante a RN7 (projeto só de imagens ou só de vídeos) e estende ao vídeo o comportamento que já existe para imagens. | Dado um projeto de vídeo, quando adiciono 1 imagem e 1 vídeo válido, então a imagem é rejeitada com 'Invalid project type' e o vídeo é carregado. |
| REQ-VID-UPLOAD-007 | O sistema deve aceitar apenas ficheiros de vídeo MP4, WEBM ou MOV, rejeitando os restantes com o erro 'Invalid file type!' e indicando os formatos aceites. | Deve ter | Mantido (passa de NF no Exercício 1 a funcional: regra de validação RN5) | NOVO | UC-VID-001, Passo 3, E2, RN5 | Limita os formatos aceites no MVP. | Dado um ficheiro .avi, quando o submeto, então é rejeitado com 'Invalid file type!' e a mensagem lista MP4, WEBM e MOV; ficheiros .mp4, .webm e .mov válidos passam esta verificação. |
| REQ-VID-UPLOAD-008 | O sistema deve rejeitar, com o erro 'Invalid file content!', os ficheiros cujo conteúdo não corresponda ao formato indicado pela extensão. | Deveria ter | Mantido | NOVO | UC-VID-001, Passo 3, E8 | Evita aceitar ficheiros com extensão enganadora. | Dado um ficheiro de texto renomeado para .mp4, quando o submeto, então é rejeitado com 'Invalid file content!'. |
| REQ-VID-UPLOAD-009 | O sistema deve aceitar apenas vídeos MP4 e MOV com codec H.264 e vídeos WEBM com codec VP8 ou VP9, rejeitando os restantes com o erro 'Invalid video codec!'. | Deve ter | Mantido (passa de NF no Exercício 1 a funcional: regra de validação RN5) | NOVO | UC-VID-001, Passo 3, E9, RN5 | Limita os codecs suportados no MVP. | Dado um .mp4 com codec H.265, quando o submeto, então é rejeitado com 'Invalid video codec!'; um .webm com VP9 é aceite. |
| REQ-VID-UPLOAD-010 | O sistema deve rejeitar os vídeos com mais de 500 MB, com o erro 'File exceeds the maximum allowed size' e indicando o tamanho máximo. | Deve ter | Mantido (passa de NF no Exercício 1 a funcional: regra de validação RN5) | NOVO | UC-VID-001, Passo 3, E3, RN5 | Controla o custo de armazenamento (interesse do Proprietário do Sistema) e protege o sistema, já que a resolução não é limitada (A8). | Dado um vídeo de 501 MB, quando o submeto, então é rejeitado com a mensagem indicada (a referir 500 MB); um vídeo de 500 MB é aceite. |
| REQ-VID-UPLOAD-011 | O sistema deve rejeitar os vídeos com duração superior a 10 minutos, com o erro 'File exceeds the maximum allowed duration' e indicando a duração máxima. | Deve ter | Mantido (passa de NF no Exercício 1 a funcional: regra de validação RN5) | NOVO | UC-VID-001, Passo 3, E4, RN5 | Controla o custo de armazenamento e de processamento posterior. | Dado um vídeo com 10 min 01 s, quando o submeto, então é rejeitado com a mensagem indicada (a referir 10 minutos); um vídeo com 10 min 00 s é aceite. |
| REQ-VID-UPLOAD-012 | O sistema deve descartar cada ficheiro rejeitado, cancelado ou cujo carregamento falhe, sem o associar ao projeto nem conservar dados (completos ou parciais), mantendo os restantes ficheiros da submissão e os já carregados com sucesso. | Deve ter | Mantido | NOVO | UC-VID-001, RN4, E2–E5, E7, E8, E9, FA3, Pós-condição mínima | Isola cada ficheiro dos restantes e cumpre a garantia mínima. | Dado uma submissão com 3 vídeos em que 1 é inválido, quando termina, então os 2 válidos ficam associados ao projeto, o inválido não fica armazenado e o carregamento dos 2 válidos não foi interrompido. |
| REQ-VID-UPLOAD-013 | O sistema deve apresentar, para cada ficheiro que passou a validação, o nome, o estado (In queue, Processing, Done ou Fail) e uma barra de progresso com a percentagem de carregamento, atualizados pelo menos 1 vez por segundo enquanto o carregamento progride. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 4, Passo 5 | O carregamento de ficheiros até 500 MB não é instantâneo; o utilizador precisa de o acompanhar. | Dado o carregamento de um vídeo de 500 MB, quando decorre, então nome, estado, barra e percentagem são apresentados e atualizados pelo menos 1 vez por segundo, terminando em Done. |
| REQ-VID-UPLOAD-015 | O sistema deve permitir ao utilizador cancelar o carregamento de um ficheiro em curso, interrompendo-o sem afetar os restantes. | Deveria ter | Mantido | NOVO | UC-VID-001, FA3 | Dá controlo ao utilizador sobre carregamentos longos. | Dado 2 carregamentos em curso, quando cancelo o primeiro, então este é interrompido e descartado e o segundo conclui normalmente. |
| REQ-VID-UPLOAD-016 | O sistema deve, quando o carregamento de um ficheiro falhar a meio, interromper a sua barra de progresso e apresentar o estado Fail com o erro 'Failed upload.', exigindo nova submissão do ficheiro para o repetir. | Deve ter | Mantido | NOVO | UC-VID-001, E5, A3 | Comunica a falha ao utilizador; o MVP não retoma carregamentos. | Dado um carregamento interrompido a meio (ex.: perda de ligação), então a barra pára, o estado é Fail com 'Failed upload.', o carregamento não é retomado e os ficheiros já concluídos mantêm-se. |
| REQ-VID-UPLOAD-017 | O sistema deve associar ao projeto (novo ou existente) cada vídeo carregado com sucesso, ficando disponível nesse projeto. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 6, FA2, RN4, Pós-condição de sucesso | Torna os vídeos disponíveis para operações de edição. | Dado uma submissão com 2 vídeos que terminam em Done, então o projeto contém exatamente esses 2 vídeos. |
| REQ-VID-UPLOAD-018 | O sistema deve criar o novo projeto apenas se pelo menos um vídeo tiver sido carregado com sucesso; caso contrário, deve apresentar 'No files were uploaded.' e não criar o projeto. | Deve ter | Mantido | NOVO | UC-VID-001, Passo 6, E6, RN6, Pós-condição mínima | Evita projetos de vídeo vazios. | Dado uma criação com 1 único vídeo inválido, quando termina, então aparece 'No files were uploaded.' e o projeto não existe na biblioteca; com 1 vídeo válido e 1 inválido, o projeto é criado. |
| REQ-VID-UPLOAD-021 | O sistema deve aceitar ficheiros .zip na submissão de vídeos, validando individualmente cada vídeo contido (formato, conteúdo, codec, tamanho e duração) e ignorando os ficheiros inválidos. | Deveria ter | Mantido | NOVO | UC-VID-001, A6 | Mantém a paridade com a submissão de imagens por .zip, que já existe. | Dado um .zip com 2 vídeos válidos e 1 ficheiro inválido, quando o submeto, então os 2 vídeos são carregados e o inválido é ignorado. |

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
|--------|---------------|----------------------------------|--------------|------------------|--------------|----------------------|----------------------------------------|
| REQ-VID-UPLOAD-014 | O sistema deve carregar em paralelo todos os vídeos válidos de uma mesma submissão. | Eficiência de Desempenho (comportamento temporal) | Todos os ficheiros válidos da submissão em paralelo, sem limite de número (A4) | Paralelismo limitado e configurável; os restantes aguardam em In queue | Refinado | UC-VID-001, Passo 4, RN10, A4 / DQ-001 | Dado uma submissão com 3 vídeos válidos, quando o carregamento começa, então os 3 ficheiros estão em estado Processing em simultâneo. |
| REQ-VID-UPLOAD-020 | O sistema deve armazenar cada vídeo carregado sem alterar o seu conteúdo original. | Segurança (integridade) | Hash SHA-256 do ficheiro armazenado igual ao do original | Hash igual ao do original, verificado no carregamento e periodicamente | Refinado | UC-VID-001, RN9, Pós-condição de sucesso / DQ-004 | Dado um vídeo carregado com sucesso, quando comparo o ficheiro armazenado com o original, então o hash SHA-256 é idêntico. |
| REQ-VID-UPLOAD-022 | O sistema deve, em ≤ 60 s após a interrupção de um carregamento por falha, marcar o ficheiro como Fail e remover os dados parciais, sem deixar criado nenhum projeto sem vídeos associados. | Fiabilidade (tolerância a falhas) | ≤ 60 s; sem retoma (A3) | Retoma automática do carregamento interrompido (até 3 tentativas) antes de marcar Fail | Novo | UC-VID-001, E5, Pós-condição mínima, A3 / DQ-002 | Dado um corte de ligação injetado a 80 % do carregamento de um vídeo de 500 MB, então em ≤ 60 s o ficheiro está em Fail, não existem dados parciais armazenados nem projeto sem vídeos, e um segundo carregamento em curso termina em Done. |
| REQ-VID-UPLOAD-023 | O sistema deve permitir o acesso a um vídeo carregado apenas a utilizadores autenticados e autorizados sobre o projeto. | Segurança (confidencialidade) | Apenas o proprietário do projeto (A7, A11) | Proprietário e utilizadores com permissão de partilha explícita, com endereços de acesso que expiram em ≤ 15 min | Novo | UC-VID-001, A7, A11 / DQ-003 | Dado um pedido de acesso a um vídeo sem sessão, então devolve erro de autenticação; com a sessão de outro utilizador sem permissão, devolve erro de autorização. |

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
|-----------------------|---------------|----------------------------|--------------------------------|
| Formato, codec, duração e dimensão do vídeo | Sim | Formato, codec, tamanho e duração são validados antes do carregamento, bem como a correspondência entre conteúdo e extensão. A dimensão (resolução) não é limitada no MVP (A8): o limite de 500 MB protege o sistema. Alargar formatos e codecs (ex.: AVI, H.265) fica fora do MVP. | REQ-VID-UPLOAD-007, 008, 009, 010, 011 |
| Estado, progresso, cancelamento e resultado | Sim | Estado e progresso por ficheiro, cancelamento individual e resultado final por ficheiro e por submissão (E6). Neste caso de uso o único processamento é o carregamento; a edição de vídeo pertence a outros casos de uso. | REQ-VID-UPLOAD-013, 015, 016, 017, 018 |
| Falhas durante o processamento | Sim | Aplica-se ao carregamento: a falha de um ficheiro não afeta os restantes, o ficheiro passa a Fail e o estado fica consistente. Sem retoma no MVP (A3). | REQ-VID-UPLOAD-012, 016, 022 |
| Persistência e expiração dos ficheiros | Sim | Os vídeos ficam inalterados (RN9). A ausência de expiração (A9) é o comportamento por omissão e não precisa de requisito próprio. Não há ficheiros de saída porque o caso de uso não produz resultados. Os backups dos vídeos ficam fora do MVP (A9). | REQ-VID-UPLOAD-020 |
| Perfis e contagem de operações | Sim | Só registado e premium carregam vídeos, com os mesmos limites nos dois perfis (A5); o carregamento não consome quota (RN2), o que coincide com o comportamento existente e não precisa de requisito próprio. | REQ-VID-UPLOAD-004 |
| Encadeamento de ferramentas e processamento em lote | Não (exclusão explícita) | O carregamento não é uma ferramenta, por isso não entra no encadeamento nem no processamento em lote existentes; os vídeos ficam disponíveis para casos de uso de edição futuros. A submissão de vários ficheiros (RN3) é um lote de carregamento, não de processamento. | N/A |

**Evolução:** *Mantido* = requisito preservado; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
|--------------------------------|-------------------------------------------|--------------------------|--------------------------------|
| Diálogo 'New Project' e criação de projeto | Alterar | O diálogo passa a incluir o seletor de tipo (Imagem/Vídeo, Imagem por defeito) e a verificar a compatibilidade dos ficheiros com o tipo antes de criar o projeto. A criação de projetos de imagem mantém-se. | REQ-VID-UPLOAD-001, 002, 005, 018 |
| Modelo de projeto | Estender | O projeto passa a ter um tipo (Imagem ou Vídeo) e a poder associar vídeos. | REQ-VID-UPLOAD-001, 017, 018 |
| Upload de ficheiros e rejeição individual de ficheiros | Estender | Para além das imagens, passa a aceitar e validar vídeos (formato, conteúdo, codec, 500 MB, 10 min) e .zip; a rejeição 'Invalid project type' passa a abranger projetos de vídeo; passa a haver progresso por ficheiro, cancelamento, carregamento em paralelo; o botão 'Add Image' mantém-se e os projetos de vídeo apresentam 'Add Video'. A verificar na implementação: limites de tamanho de pedido do proxy (nginx) e do gateway para ficheiros até 500 MB. | REQ-VID-UPLOAD-003, 006 a 016, 021 |
| Armazenamento de ficheiros | Estender | Passa a guardar vídeos até 500 MB sem alterar o conteúdo original; os ficheiros rejeitados, cancelados ou falhados não persistem. Os backups automáticos cobrem apenas as bases de dados, pelo que os vídeos ficam fora no MVP (A9). | REQ-VID-UPLOAD-012, 020, 022 |
| Perfis e controlo de acesso | Estender | Nova permissão: o carregamento de vídeos só é permitido a registado e premium; o acesso aos vídeos reutiliza a autenticação existente e fica restrito ao proprietário do projeto. As permissões existentes para imagens não mudam. | REQ-VID-UPLOAD-004, 023 |
| Mensagens de erro uniformizadas | Estender | As novas mensagens de erro do upload de vídeo passam a ser tratadas pelo mesmo mecanismo de apresentação de erros. | REQ-VID-UPLOAD-004, 007 a 011, 016, 018 |
| Quota de operações diárias | Manter | A quota só conta operações avançadas (ferramentas de IA); o upload de vídeos não consome quota (RN2), sem necessidade de alterar o mecanismo. | — (RN2) |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
|------------------------|-------------------------|--------------------------------|
| Passo 1 | Abrir a biblioteca | N/A (comportamento existente; Manter) |
| Passo 2 | 'New Project': nome, tipo e zona de drag and drop | REQ-VID-UPLOAD-001, 002 |
| Passo 3 | Verificar tipo dos ficheiros e validar cada vídeo | REQ-VID-UPLOAD-005, 007, 008, 009, 010, 011 |
| Passo 4 | Carregamento em paralelo e lista de ficheiros com estado | REQ-VID-UPLOAD-013, 014 |
| Passo 5 | Atualização de barra, percentagem e estado (≥ 1 vez por segundo) | REQ-VID-UPLOAD-013 |
| Passo 6 | Criar o projeto e associar os vídeos | REQ-VID-UPLOAD-017, 018, 022 |
| Passo 7 | Abrir e apresentar o projeto | N/A (comportamento já existente para projetos de imagem; Manter) |
| FA1 | Upload através da biblioteca | REQ-VID-UPLOAD-002 |
| FA2 | Adicionar vídeo a projeto existente | REQ-VID-UPLOAD-003, 006, 017 |
| FA3 | Cancelar carregamento de um ficheiro | REQ-VID-UPLOAD-012, 015 |
| E1 | Utilizador sem perfil registado/premium | REQ-VID-UPLOAD-004 |
| E2 | Formato não suportado | REQ-VID-UPLOAD-007, 012 |
| E3 | Tamanho excede o limite | REQ-VID-UPLOAD-010, 012 |
| E4 | Duração excede o limite | REQ-VID-UPLOAD-011, 012 |
| E5 | Falha a meio do carregamento | REQ-VID-UPLOAD-012, 016, 022 |
| E6 | Nenhum ficheiro carregado com sucesso | REQ-VID-UPLOAD-018 |
| E7 | Ficheiros incompatíveis com o tipo de projeto | REQ-VID-UPLOAD-005, 006, 012 |
| E8 | Conteúdo não corresponde à extensão | REQ-VID-UPLOAD-008, 012 |
| E9 | Codec não suportado | REQ-VID-UPLOAD-009, 012 |
| RN1 | Apenas registado e premium | REQ-VID-UPLOAD-004 |
| RN2 | Não conta para quotas | — (coincide com o comportamento existente: só as ferramentas de IA consomem quota; ver 4.2) |
| RN3 | Um ou mais vídeos por operação | REQ-VID-UPLOAD-002, 003 |
| RN4 | Válidos associados; rejeitados não interrompem os restantes | REQ-VID-UPLOAD-012, 017 |
| RN5 | Formatos, codecs, 500 MB, 10 min | REQ-VID-UPLOAD-007, 009, 010, 011 |
| RN6 | Projeto só criado com pelo menos 1 sucesso | REQ-VID-UPLOAD-018 |
| RN7 | Projeto só de imagens ou só de vídeos; tipo fixo | REQ-VID-UPLOAD-005, 006 (a imutabilidade do tipo resulta de o caso de uso não prever qualquer forma de o alterar) |
| RN8 | Um único tipo selecionado, Imagem por defeito | REQ-VID-UPLOAD-001 |
| RN9 | Conteúdo original inalterado | REQ-VID-UPLOAD-020 |
| RN10 | Carregamento em paralelo | REQ-VID-UPLOAD-014 |
| Pós-condição de sucesso | Vídeos associados, inalterados e disponíveis | REQ-VID-UPLOAD-017, 020 |
| Pós-condição mínima | Sem rejeitados nem dados parciais; sem projeto vazio; erros comunicados | REQ-VID-UPLOAD-012, 016, 018, 022 |
| A2 | Add Video em vez de Add Image | REQ-VID-UPLOAD-003 |
| A3 | Falha não é retomada | REQ-VID-UPLOAD-016, 022 |
| A4 | Sem limite de vídeos por operação nem por projeto | REQ-VID-UPLOAD-014 |
| A5 | Limites iguais para registado e premium | REQ-VID-UPLOAD-007, 009, 010, 011 (aplicam-se aos dois perfis) |
| A6 | Upload por .zip | REQ-VID-UPLOAD-021 |
| A7 | Upload só pelo dono; sem partilha no MVP | REQ-VID-UPLOAD-023 |
| A8 | Resolução não limitada | N/A (sem requisito: o limite de 500 MB, REQ-VID-UPLOAD-010, protege o sistema) |
| A9 | Vídeos não expiram; fora dos backups no MVP | N/A (comportamento por omissão; sem requisito próprio) |
| A11 | Acesso aos vídeos reutiliza a autenticação existente | REQ-VID-UPLOAD-023 |
| DQ-001 a DQ-004 | Decisões de qualidade (tabela seguinte) | REQ-VID-UPLOAD-014, 020, 022, 023 |

**Decisões de qualidade introduzidas nesta aula**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
|--------|--------------------------|-----------------|--------------------------------|
| DQ-001 | O MVP carrega todos os ficheiros válidos em paralelo, sem limite; em produção o paralelismo é limitado e os restantes aguardam em fila. | A RN10 e a A4 não limitam o número de ficheiros; em produção, limitá-lo protege os recursos e dá sentido ao estado In queue. | REQ-VID-UPLOAD-014 |
| DQ-002 | O MVP não retoma carregamentos interrompidos e limpa os dados parciais em ≤ 60 s; produção retoma automaticamente. | Decorre da A3 (sem retoma no MVP) e mantém o sistema consistente (A10). | REQ-VID-UPLOAD-022 |
| DQ-003 | O acesso aos vídeos exige autenticação e, no MVP, é restrito ao proprietário; em produção alarga-se a utilizadores com partilha explícita e endereços temporários. | A partilha está fora do âmbito do MVP (A7) e o acesso reutiliza a autenticação existente (A11). Sem impacto funcional no caso de uso. | REQ-VID-UPLOAD-023 |
| DQ-004 | A integridade do vídeo é verificada comparando o hash do ficheiro armazenado com o do original. | Dá um critério verificável para a RN9 (conteúdo original inalterado). | REQ-VID-UPLOAD-020 |

**Verificações de cobertura**
- [x] Cada requisito funcional e não funcional aparece na matriz.
- [x] Cada requisito tem origem identificada: elemento do caso de uso, regra de negócio ou decisão de qualidade.
- [x] Todos os elementos relevantes do caso de uso têm requisito associado ou justificação para não terem.
- [x] Os tópicos excluídos na secção 4.1.3 estão justificados.
- [x] O impacto no sistema existente está atualizado e ligado aos requisitos relevantes.

---

## ✅ Lista de verificação antes de entregar

- [ ] As secções 0 a 3 do dossiê foram preservadas; as assunções, questões em aberto e utilização de IA foram atualizadas.
- [ ] A funcionalidade, o caso de uso e o perfil do Exercício 1 foram mantidos.
- [ ] Requisitos funcionais estão completos para o âmbito e têm critérios verificáveis.
- [ ] Requisitos de qualidade estão classificados e distinguem os alvos MVP e produção.
- [ ] Os IDs existentes foram preservados quando a intenção não mudou.
- [ ] A análise de completude não alargou o âmbito sem decisão explícita.
- [ ] A matriz de rastreabilidade não tem requisitos órfãos nem elementos relevantes por cobrir.
- [ ] As decisões de qualidade e os respetivos requisitos estão identificados.

---