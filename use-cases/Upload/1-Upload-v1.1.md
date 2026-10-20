# 📝 Exercício 1 — Template de Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS


---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | Grupo 6 - PL5 |
| **Autores** | João Bernardo (pg65418) |
| **Data** | 2026-10-14 |
| **Versão do documento** | v1.1 |
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
| **Versão** | v1.1 |
| **Autor** | João Bernardo |
| **Data** | 2026-10-14 |
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
| 3 | O utilizador define o nome, seleciona o tipo de projeto 'Vídeo' e arrasta ou seleciona os ficheiros para carregamento na zona de *drag and drop*, e submete a criação do projeto | Verifica que os ficheiros correspondem ao tipo de projeto selecionado (se incluírem tipos diferentes, avisa o utilizador antes de criar o projeto - ver E7) e valida cada vídeo quanto ao formato, conteúdo, tamanho e duração |
| 4 | - | Inicia, em paralelo, o carregamento dos vídeos que passaram a verificação e apresenta, para cada ficheiro, o nome, o estado (In queue, Processing, Done, Fail) e uma barra de progresso com a percentagem de carregamento |
| 5 | - | Atualiza continuamente a barra e a percentagem de cada ficheiro e, quando termina, apresenta o estado de cada. |
| 6 | - | Se pelo menos um vídeo foi carregado com sucesso, cria o projeto e associa-lhe esses vídeos |
| 7 | - | Abre e apresenta o projeto |


### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 - Upload através de biblioteca | O utilizador arrasta um ou mais vídeos para a zona de drag and drop da biblioteca → o sistema apresenta a interface para definir o nome e o tipo do projeto → após o utilizador definir o nome, selecionar o tipo e submeter a criação do projeto, o sistema valida os ficheiros → o fluxo continua no passo 4. |
| FA2 - Adicionar vídeo a projeto existente | O utilizador abre um projeto de vídeo e seleciona Add Video → arrasta ou seleciona um ou mais vídeos → o sistema verifica que os ficheiros correspondem ao tipo do projeto e valida cada vídeo quanto ao formato, conteúdo, tamanho e duração → o fluxo continua nos passos 4 e 5 → após o carregamento, associa os vídeos carregados com sucesso ao projeto existente |

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
| RN5 | Apenas os vídeos em formato: MP4, WEBM ou MOV; com tamanho até 500 MB e duração até 10 minutos, podem ser carregados |
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
| A6 | O carregamento de vídeos através de ficheiro .zip funciona do mesmo modo que a submissão de imagens já existente; cada vídeo dentro do .zip é validado individualmente (formato, conteúdo, tamanho e duração) e os ficheiros inválidos são ignorados. |

### 2.8 Questões em Aberto

Sem questões nesta versão.


---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| ChatGPT | Apoio na estruturação e revisão do caso de uso | Revisão manual do conteúdo pela equipa, verificando o alinhamento com o enunciado, o template e as regras do PictuRAS |
| Claude (Anthropic) | Revisão do caso de uso e apoio no esboço de requisitos derivados (secção 4) | Revisão manual pela equipa e verificação da cobertura entre o caso de uso e os requisitos |

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

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| REQ-VID-UPLOAD-001 | O sistema deve permitir a utilizadores registados ou premium submeter um ou mais vídeos numa única operação. | F | Deve ter | NOVO | Trigger, RN3 | Dado um utilizador registado, quando submete 3 vídeos válidos, então os 3 são aceites para carregamento. |
| REQ-VID-UPLOAD-002 | O sistema deve rejeitar a submissão de vídeos por utilizadores sem perfil registado ou premium, com a mensagem "Only premium/registered users can upload videos!", antes de validar qualquer ficheiro. | F | Deve ter | ALT | E1, RN1 | Dado um utilizador anónimo, quando submete um vídeo, então vê a mensagem e nenhum ficheiro é validado. |
| REQ-VID-UPLOAD-003 | O sistema deve apresentar, no diálogo de criação de projeto, um seletor com os tipos Imagem e Vídeo, com um único tipo selecionado de cada vez e Imagem por defeito. | F | Deve ter | NOVO | Passo 2, RN8 | Dado o diálogo recém-aberto, então existem os dois tipos e só Imagem está selecionado. |
| REQ-VID-UPLOAD-004 | O sistema deve impedir a alteração do tipo de um projeto depois de criado. | F | Deve ter | NOVO | RN7 | Dado um projeto criado, então não existe forma de alterar o seu tipo. |
| REQ-VID-UPLOAD-005 | O sistema deve avisar o utilizador, antes de criar o projeto, quando os ficheiros submetidos incluem tipos diferentes do tipo de projeto selecionado, permitindo-lhe corrigir o tipo ou cancelar. | F | Deve ter | ALT | FA1, E7 | Dado 1 vídeo e 1 imagem com tipo Imagem, quando submete, então vê o aviso e o projeto ainda não foi criado. |
| REQ-VID-UPLOAD-006 | O sistema deve rejeitar, num projeto existente, os ficheiros de tipo diferente do projeto, com a mensagem "Invalid project type", sem interromper os restantes. | F | Deve ter | ALT | FA2, E7, RN4, RN7 | Dado um projeto de vídeo, quando adiciona uma imagem e um vídeo válido, então a imagem é rejeitada e o vídeo segue. |
| REQ-VID-UPLOAD-007 | O sistema deve aceitar apenas vídeos nos formatos MP4, WEBM e MOV e rejeitar os restantes com a mensagem "Invalid file type!". | F | Deve ter | NOVO | E2, RN5, A5 | Dado um .avi e um .mp4 válido, então o .avi é rejeitado e o .mp4 segue. |
| REQ-VID-UPLOAD-008 | O sistema deve rejeitar ficheiros cujo conteúdo não corresponde ao formato indicado pela extensão, com a mensagem "Invalid file content!". | F | Deve ter | NOVO | E8 | Dado um ficheiro de texto renomeado para .mp4, então é rejeitado com a mensagem. |
| REQ-VID-UPLOAD-009 | O sistema deve rejeitar vídeos com tamanho superior a 500 MB, com a mensagem "File exceeds the maximum allowed size". | NF (Capacidade) | Deve ter | NOVO | E3, RN5, A5 | Dado um vídeo de 501 MB, então é rejeitado; um de 500 MB é aceite. |
| REQ-VID-UPLOAD-010 | O sistema deve rejeitar vídeos com duração superior a 10 minutos, com a mensagem "File exceeds the maximum allowed duration". | NF (Capacidade) | Deve ter | NOVO | E4, RN5, A5 | Dado um vídeo de 10 min 1 s, então é rejeitado; um de 10 min é aceite. |
| REQ-VID-UPLOAD-011 | O sistema deve indicar, na mensagem de rejeição, os formatos aceites, o tamanho máximo ou a duração máxima, conforme o motivo da rejeição. | F | Poderia ter | NOVO | E2, E3, E4 | Dado um vídeo rejeitado por tamanho, então a mensagem indica 500 MB. |
| REQ-VID-UPLOAD-012 | O sistema deve validar cada vídeo de forma independente quanto ao formato, conteúdo, tamanho e duração, e carregar apenas os que passam, sem que a rejeição de um impeça os restantes. | F | Deve ter | NOVO | Passos 3 e 4, RN4 | Dado 3 ficheiros em que 1 é inválido, então os outros 2 são carregados. |
| REQ-VID-UPLOAD-013 | O sistema deve carregar em paralelo os vídeos válidos de uma mesma submissão. | NF (Desempenho) | Poderia ter | NOVO | Passo 4, RN3, RN10 | Dado 3 vídeos válidos, então os 3 estão em "Processing" ao mesmo tempo. |
| REQ-VID-UPLOAD-014 | O sistema deve confirmar a submissão em 3 s ou menos, independentemente do tamanho dos vídeos. | NF (Desempenho) | Deveria ter | NOVO | Passos 3 e 4 | Dado um vídeo de 500 MB, quando submete, então o estado "In queue" aparece em ≤ 3 s. |
| REQ-VID-UPLOAD-015 | O sistema deve apresentar, para cada ficheiro, o nome e o estado (In queue, Processing, Done, Fail). | F | Deveria ter | NOVO | Passos 4 e 5 | Dado um carregamento em curso, então cada ficheiro mostra nome e estado atual. |
| REQ-VID-UPLOAD-016 | O sistema deve apresentar, para cada ficheiro, uma barra de progresso com a percentagem de carregamento, atualizada pelo menos a cada 5 s. | NF (Usabilidade) | Deveria ter | NOVO | Passos 4 e 5 | Dado um carregamento longo, então a percentagem muda no máximo de 5 em 5 s. |
| REQ-VID-UPLOAD-017 | O sistema deve criar o projeto apenas quando pelo menos um vídeo é carregado com sucesso. | F | Deve ter | NOVO | Passo 6, RN6 | Dado 1 sucesso e 2 falhas, então o projeto é criado. |
| REQ-VID-UPLOAD-018 | O sistema deve associar ao projeto os vídeos carregados com sucesso. | F | Deve ter | NOVO | Passo 6, Pós-condição de sucesso | Dado 2 sucessos, então o projeto contém esses 2 vídeos. |
| REQ-VID-UPLOAD-019 | O sistema deve abrir e apresentar o projeto depois de criado. | F | Deve ter | NOVO | Passo 7 | Dado o projeto criado, então este abre automaticamente. |
| REQ-VID-UPLOAD-020 | O sistema deve apresentar a mensagem "No files were uploaded." quando nenhum ficheiro é carregado com sucesso. | F | Deve ter | NOVO | E6, RN6 | Dado só ficheiros inválidos, então vê a mensagem e não existe projeto novo. |
| REQ-VID-UPLOAD-021 | O sistema deve descartar o ficheiro e apresentar o estado Fail com a mensagem "Failed upload." quando o carregamento falha a meio (incluindo sessão expirada), sem o retomar. | F | Deve ter | NOVO | E5, RN4, A3 | Dado a ligação cortada a meio, então o ficheiro fica em "Fail" e não é retomado. |
| REQ-VID-UPLOAD-022 | O sistema não deve guardar dados parciais de ficheiros rejeitados ou cujo carregamento falhou. | NF (Fiabilidade) | Deve ter | NOVO | Pós-condição mínima | Dado um carregamento falhado, então não fica nenhum dado dele armazenado. |
| REQ-VID-UPLOAD-023 | O sistema deve guardar o vídeo carregado sem alterações ao seu conteúdo original. | NF (Fiabilidade) | Poderia ter | NOVO | Pós-condição de sucesso, RN9 | Dado um vídeo carregado, então o seu conteúdo é idêntico ao do ficheiro original. |
| REQ-VID-UPLOAD-024 | O sistema deve permitir adicionar vídeos a um projeto de vídeo existente através do botão "Add Video" (em vez de "Add Image") e associar-lhe os vídeos carregados com sucesso. | F | Deveria ter | NOVO | FA2, A2 | Dado um projeto de vídeo, quando usa Add Video, então o vídeo válido fica associado ao projeto. |
| REQ-VID-UPLOAD-025 | O sistema não deve contar o carregamento de vídeos na quota de 5 operações diárias nem em qualquer outra quota. | F | Deve ter | ALT | RN2 | Dado um utilizador registado com 5 operações usadas, então ainda consegue carregar vídeos. |
| REQ-VID-UPLOAD-026 | O sistema deve aceitar ficheiros .zip com vídeos, validando cada vídeo do .zip individualmente e ignorando os ficheiros inválidos. | F | Deveria ter | ALT | A6 | Dado um .zip com 2 vídeos válidos e 1 ficheiro inválido, então os 2 válidos são carregados. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| Zona de drag and drop | Manter | É reutilizada sem alterações (A1) | REQ-VID-UPLOAD-001 |
| Diálogo "New Project" | Estender | Passa a ter o seletor Imagem/Vídeo, com Imagem por defeito | REQ-VID-UPLOAD-003, 005 |
| Perfis (anónimo, registado, premium) | Estender | Vídeo só para registado e premium; as imagens continuam abertas ao anónimo | REQ-VID-UPLOAD-002 |
| Limite de 5 operações diárias (registado) | Estender | O carregamento de vídeos fica fora da contagem | REQ-VID-UPLOAD-025 |
| Submissão de .zip | Estender | Passa a aceitar vídeos | REQ-VID-UPLOAD-026 |
| Verificação "Invalid project type" | Estender | Passa a comparar com o tipo Vídeo e a avisar antes de criar o projeto | REQ-VID-UPLOAD-005, 006 |
| Projeto e biblioteca | Estender | O projeto passa a ter um tipo fixo; abrem-se projetos de vídeo | REQ-VID-UPLOAD-004, 017, 018, 019 |
| Botões Add Image / Add Video | Manter / Estender | Add Image não muda; os projetos de vídeo têm Add Video | REQ-VID-UPLOAD-024 |
| Armazenamento | Estender | Guarda vídeos até 500 MB, sem limite por perfil | REQ-VID-UPLOAD-009, 022, 023 |
| Encadeamento, lote e exportação | Manter | Não são afetados por este caso de uso | — |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| Trigger | Iniciar carregamento | REQ-VID-UPLOAD-001 |
| Pré-condição 1 | Sessão iniciada | REQ-VID-UPLOAD-002, REQ-VID-UPLOAD-021 |
| Pré-condição 2 | Projeto existente só com vídeos | REQ-VID-UPLOAD-004, REQ-VID-UPLOAD-006 |
| Passo 1 | Abrir biblioteca | Sem requisito: já existe e não muda |
| Passo 2 | Diálogo com seletor e drag and drop | REQ-VID-UPLOAD-003 |
| Passo 3 | Validação de tipo, formato, conteúdo, tamanho e duração | REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-014 |
| Passo 4 | Início do carregamento e estados | REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-013, REQ-VID-UPLOAD-014, REQ-VID-UPLOAD-015, REQ-VID-UPLOAD-016 |
| Passo 5 | Progresso e estado final | REQ-VID-UPLOAD-015, REQ-VID-UPLOAD-016 |
| Passo 6 | Criar projeto e associar vídeos | REQ-VID-UPLOAD-017, REQ-VID-UPLOAD-018 |
| Passo 7 | Abrir o projeto | REQ-VID-UPLOAD-019 |
| FA1 | Upload através da biblioteca | REQ-VID-UPLOAD-005 |
| FA2 | Adicionar a projeto existente | REQ-VID-UPLOAD-006, REQ-VID-UPLOAD-024 |
| E1 | Perfil sem permissão | REQ-VID-UPLOAD-002 |
| E2 | Formato não suportado | REQ-VID-UPLOAD-007, REQ-VID-UPLOAD-011 |
| E3 | Tamanho excedido | REQ-VID-UPLOAD-009, REQ-VID-UPLOAD-011 |
| E4 | Duração excedida | REQ-VID-UPLOAD-010, REQ-VID-UPLOAD-011 |
| E5 | Falha a meio (inclui sessão expirada) | REQ-VID-UPLOAD-021 |
| E6 | Nenhum ficheiro carregado | REQ-VID-UPLOAD-020 |
| E7 | Ficheiros incompatíveis com o tipo de projeto | REQ-VID-UPLOAD-005, REQ-VID-UPLOAD-006 |
| E8 | Conteúdo não corresponde ao formato | REQ-VID-UPLOAD-008 |
| Pós-condição de sucesso | Vídeos associados, inalterados e disponíveis | REQ-VID-UPLOAD-018, REQ-VID-UPLOAD-023, REQ-VID-UPLOAD-024 |
| Pós-condição mínima | Sem dados parciais, sucessos mantidos | REQ-VID-UPLOAD-018, REQ-VID-UPLOAD-022 |
| RN1 | Só registado e premium | REQ-VID-UPLOAD-002 |
| RN2 | Não conta para quotas | REQ-VID-UPLOAD-025 |
| RN3 | Um ou mais vídeos por operação | REQ-VID-UPLOAD-001, REQ-VID-UPLOAD-013 |
| RN4 | Rejeitados não bloqueiam os restantes | REQ-VID-UPLOAD-006, REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-021 |
| RN5 | Formatos, 500 MB e 10 min | REQ-VID-UPLOAD-007, REQ-VID-UPLOAD-009, REQ-VID-UPLOAD-010 |
| RN6 | Projeto só se houver sucesso | REQ-VID-UPLOAD-017, REQ-VID-UPLOAD-020 |
| RN7 | Projeto só com um tipo, fixo | REQ-VID-UPLOAD-004, REQ-VID-UPLOAD-006 |
| RN8 | Tipo por defeito e único | REQ-VID-UPLOAD-003 |
| RN9 | Ficheiro original inalterado | REQ-VID-UPLOAD-023 |
| RN10 | Carregamento em paralelo | REQ-VID-UPLOAD-013 |
| A1 | Drag and drop reutilizado | Sem requisito novo (Manter na 4.2) |
| A2 | Add Video em vez de Add Image | REQ-VID-UPLOAD-024 |
| A3 | Falha não é retomada | REQ-VID-UPLOAD-021 |
| A4 | Sem limite de vídeos | Sem requisito: assunção, não verificada no MVP |
| A5 | Limites iguais por perfil | REQ-VID-UPLOAD-007, REQ-VID-UPLOAD-009, REQ-VID-UPLOAD-010 |
| A6 | Ficheiros .zip | REQ-VID-UPLOAD-026 |
