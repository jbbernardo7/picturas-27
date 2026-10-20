# 📝 Exercício 1 — Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | 6 |
| **Autores** | Nuno Silva |
| **Data** | 2026-10-07 |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Extração de fotogramas de um vídeo: fotogramas a intervalos regulares com saída como imagens no projeto |
| **Perfil(s) de utilizador abrangido(s)** | Registado e Premium: o Registado e o Preimum podem guardar fotogramas, mas o Preimum dispões de limites superiores.  |

**Justificação no contexto do MVP**

Esta funcionalidade permite transformar conteúdo de um vídeo em imagens que podem ser processadas pelas ferramentas já existentes do PictuRAS. É uma funcionalidade de elevado valor para o utilizador e permite validar a integração entre o novo suporte a vídeo e o processamento de imagens existente.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Extrair fotogramas de um vídeo |
| **Versão** | v1.0 |
| **Autor** | Nuno Silva |
| **Data** | 2026-10-07 |
| **Objetivo** | Permite ao utilizador registado ou premium extrair uma sequência de fotogramas de um vídeo existente num projeto a que tenha acesso, para os utilizar como imagens no PictuRAS. |
| **Âmbito** |PictuRAS — módulo de vídeo e gestão de imagens do projeto|
| **Ator Principal** | Utilizador Registado ou Premium |
| **Stakeholders e Interesses** | - **Utilizador**: obter os fotogramas pretendidos e poder utilizá-los no projeto de acordo com o seu perfil.<br>- **Proprietário do Sistema**: garantir que a funcionalidade seja disponibilizada de forma coerente com os diferentes perfis.<br>- **Equipa de desenvolvimento das ferramentas existentes**: integrar os fotogramas extraídos com o sistema de imagens existente, reutilizando as funcionalidades já disponíveis.<br>|
| **Pré-condições** | - O vídeo foi carregado com sucesso e está disponível no projeto; <br> - O utilizador tem acesso ao projeto e ao vídeo selecionado; <br> - O utilizador tem sessão iniciada<br> |
| **Trigger** | O utilizador seleciona um vídeo no projeto e escolhe a ação «Extrair fotogramas». |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | Abre a biblioteca e seleciona um vídeo. |  	Apresenta os vídeos disponíveis no projeto que o utilizador tem permissão para consultar, valida a compatibilidade do vídeo selecionado e apresenta-o com a respetiva linha temporal e as operações disponíveis|
| 2 | Seleciona a operação «Extrair sequência de fotogramas». | Apresenta os controlos para definir o intervalo.|
| 3 | Posiciona o vídeo e marca o momento de início e o momento de fim do intervalo. | Apresenta o fotograma de cada marca e a duração do intervalo selecionado. |
| 4 | Escolhe o número de fotogramas e o formato de saída (PNG ou JPEG). | Apresenta um resumo (intervalo, nº de fotogramas, formato) e pede confirmação.|
| 5 | Confirma a extração. | Cria a tarefa de extração e apresenta o seu estado e progresso. |
| 6 | - |Extrai a sequência de fotogramas do intervalo e guarda-a, ordenada, com o instante de origem de cada fotograma. |
| 7 | - |Disponibiliza os fotogramas como imagens do projeto, de acordo com as permissões do perfil, atualiza a limite e informa o utilizador de que a operação foi concluída com sucesso.|


### 2.3 Fluxos Alternativos

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|---|---|
| FA1 – Ajustar o intervalo | No passo 3, o utilizador altera o início e/ou o fim do intervalo. O sistema atualiza os fotogramas das marcas e a duração do intervalo. O fluxo continua no passo 4. |
| FA2 – Cancelar antes da confirmação | No passo 4, o utilizador cancela o pedido. O sistema regressa ao vídeo, sem criar uma tarefa nem consumir quota diária. |
| FA3 – Cancelar durante a extração | Entre os passos 5 e 6, o utilizador cancela a tarefa. O sistema interrompe a extração, elimina os fotogramas parciais e os ficheiros temporários, e não consome quota diária. Os parâmetros selecionados são mantidos para permitir uma nova tentativa. |
| FA4 – Exceder o limite de fotogramas | No passo 4, se o número de fotogramas exceder o limite do perfil, o sistema informa o utilizador do limite aplicável e solicita a correção do número indicado. O fluxo continua após a correção dos parâmetros. |
| FA5 – Sair durante a extração | Durante a extração, o utilizador fecha a página. A tarefa continua no servidor. Quando regressa ao projeto, o sistema apresenta o estado atualizado da tarefa e, se estiver concluída, disponibiliza os fotogramas extraídos. |

### 2.4 Exceções
| **Condição** | **Comportamento do Sistema** |
|---------------|------------------------------|
| E1 - O utilizador não tem sessão iniciada ou não tem um perfil elegível. | Informa o utilizador de que necessita de iniciar sessão com uma conta registada ou premium para utilizar a funcionalidade. |
| E2 - O utilizador não tem permissão para aceder ao vídeo ou ao projeto. | Informa o utilizador de que o vídeo não está disponível ou de que não tem permissão para lhe aceder e impede o início da extração. |
| E3 - O número de fotogramas indicado é inferior a 1 ou superior ao limite do perfil. | Informa o utilizador dos limites aplicáveis ao seu perfil e solicita a correção do número de fotogramas. |
| E4 - O instante final do intervalo é igual ou anterior ao instante inicial. | Informa o utilizador de que o intervalo temporal é inválido e solicita a sua correção. |
| E5 - O utilizador já atingiu a quota diária de extrações. | Informa o utilizador de que esgotou a quota diária e impede o início de um novo pedido de extração. |
| E6 - O formato de saída selecionado não é PNG nem JPEG. | Informa o utilizador de que o formato não é suportado e solicita a seleção de um formato válido. |
| E7 - Ocorre uma falha durante a extração. | Informa o utilizador de que a extração não foi concluída com sucesso, sem consumir uma operação da quota diária. |
| E8 - O utilizador cancela o pedido de extração antes da sua conclusão. | Interrompe o processamento, quando possível, e não consome uma operação da quota diária. |
| E9 - O vídeo está indisponível ou não contém dados temporais que permitam efetuar a extração. | Informa o utilizador de que não foi possível extrair os fotogramas e não consome uma operação da quota diária. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | Os fotogramas selecionados foram extraídos do intervalo temporal definido e estão disponíveis como imagens no projeto. O vídeo original permanece inalterado, a quota do perfil é atualizada de acordo com as regras aplicáveis e os ficheiros temporários desnecessários são removidos.|
| Garantia Mínima | Em caso de falha ou cancelamento, o vídeo original permanece inalterado e nenhum resultado parcial é adicionado ao projeto. A quota não é consumida por uma operação falhada ou cancelada. O sistema elimina os ficheiros temporários resultantes da operação, quando aplicável, e apresenta uma mensagem que identifica o problema.|

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | O número de fotogramas por pedido de extração deve estar compreendido entre 1 e 10 para utilizadores registados e entre 1 e 20 para utilizadores premium. |
| RN2 | A extração de fotogramas só está disponível para utilizadores registados e premium com sessão iniciada e permissão de acesso ao projeto de vídeo. |
| RN3 | Os fotogramas extraídos são disponibilizados nos formatos PNG ou JPEG. |
| RN4 | Os fotogramas extraídos são tratados como imagens do PictuRAS e podem ser utilizados pelas ferramentas de processamento de imagens existentes. |
| RN5 | Cada pedido de extração concluído com sucesso conta como uma operação para efeitos da quota diária do perfil. Os pedidos cancelados ou falhados não consomem quota. |
| RN6 | Cada utilizador só pode aceder aos vídeos e resultados a que tem permissão de acesso. Os fotogramas guardados no projeto respeitam as regras de acesso desse projeto. |
| RN7 | Os fotogramas são extraídos a intervalos regulares, calculados dividindo a duração do intervalo selecionado pelo número de fotogramas pretendido. O primeiro instante do intervalo é incluído e o instante final é excluído. |
| RN8 | O número de pedidos de extração permitidos por dia depende do perfil do utilizador. 5 para os perfis registados e 10 para os perfis premium  |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O vídeo já foi carregado para o PictuRAS e está disponível no projeto antes de se iniciar a extração. |
| A2 |Assume-se que a extração pode demorar o suficiente para justificar processamento assíncrono e apresentação do estado da tarefa ao utilizador   |
| A3 |Para efeitos de contabilização da utilização, considera-se que um pedido corresponde a uma única operação de extração, independentemente do número de fotogramas produzidos.   |
|A4| O vídeo contém informação temporal suficiente para identificar os fotogramas correspondentes aos instantes calculados para a extração. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | Quais devem ser os limites definitivos de duração, tamanho e número de fotogramas por extração para cada perfil? Como deve ser contabilizada a limite de operações na utilização de vídeo? |
| Q2 | Quais são os formatos e codecs de vídeo obrigatórios para o MVP? É necessário suportar formatos adicionais, como HEVC/H.265? |
| Q3 | Durante quanto tempo devem ser mantidos os vídeos carregados e os resultados temporários? Os vídeos devem continuar armazenados no projeto depois de concluída a extração? |
| Q4 | O perfil anónimo deve poder submeter vídeos para extração de fotogramas? Em caso afirmativo, que limites devem ser aplicados para controlar o consumo de recursos? |
| Q5 | O utilizador deve poder executar várias extrações em simultâneo? Para operações demoradas, basta apresentar o estado da tarefa no projeto ou é necessária uma notificação adicional? |
---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Claude (Anthropic) | Primeira versão do preenchimento do template: fluxo principal, fluxos alternativos, exceções, regras de negócio, assunções e questões em aberto para o caso de uso «Extrair fotogramas de um vídeo». | _(a preencher pela equipa: revisão manual de cada secção; fluxos/exceções descartados ou alterados por não se aplicarem ao PictuRAS; valores das regras de negócio ajustados; coerência com o sistema existente.)_ |

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

**Caso de Uso:** UC-VID-001 — Extração de uma sequência de fotogramas  
**Versão do dossiê:** v1.1  
**Baseline do Exercício 1:** Especificação do caso de uso de extração de fotogramas, com revisão das regras de negócio, dos limites por perfil e da contabilização das operações.

> O catálogo 4.1 é a fonte única dos requisitos desta ERS. A matriz 4.3 rastreia esses IDs até ao caso de uso ou às decisões de qualidade. A tabela 4.2 descreve o impacto no sistema existente.

## 4.1 Requisitos da ERS

## 4.1.1 Requisitos Funcionais

Inclua os requisitos funcionais derivados no Exercício 1 e os acrescentados para completar o serviço **dentro do âmbito escolhido**. Mantenha o ID original quando a intenção não mudou. Identifique a evolução face ao Exercício 1.

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
|---|---|---|---|---|---|---|---|
| REQ-VID-EXT-001 | O sistema deve permitir ao utilizador selecionar um vídeo existente na biblioteca de um projeto a que tenha acesso. | Deve ter | Mantido | NOVO | UC-VID-001, passo 1 | Permite selecionar o vídeo de origem. | Dado um vídeo disponível no projeto, quando o utilizador o seleciona, então o vídeo fica selecionado. |
| REQ-VID-EXT-002 | O sistema deve apresentar o vídeo selecionado com a respetiva linha temporal. | Deve ter | Mantido | NOVO | UC-VID-001, passo 1 | Permite visualizar e selecionar o intervalo temporal. | Dado um vídeo selecionado, então o sistema apresenta o vídeo e a sua linha temporal. |
| REQ-VID-EXT-003 | O sistema deve disponibilizar a operação «Extrair sequência de fotogramas» para o vídeo selecionado. | Deve ter | Mantido | NOVO | UC-VID-001, passo 2, RN2 | Permite iniciar a funcionalidade. | Dado um vídeo selecionado e um utilizador elegível, quando este escolhe a operação, então são apresentados os controlos de extração. |
| REQ-VID-EXT-004 | O sistema deve permitir ao utilizador definir o instante inicial e o instante final do intervalo de extração. | Deve ter | Mantido | NOVO | UC-VID-001, passo 3 | Define o intervalo de origem dos fotogramas. | Dado um vídeo, quando o utilizador marca o início em 00:10 e o fim em 00:15, então o sistema regista esse intervalo. |
| REQ-VID-EXT-005 | O sistema deve apresentar o fotograma correspondente a cada uma das marcas temporais selecionadas. | Deve ter | Mantido | NOVO | UC-VID-001, passo 3, FA1 | Ajuda o utilizador a confirmar os instantes selecionados. | Dadas as marcas inicial e final, então o sistema apresenta o fotograma correspondente a cada uma. |
| REQ-VID-EXT-006 | O sistema deve apresentar a duração do intervalo selecionado, em segundos. | Deveria ter | Mantido | NOVO | UC-VID-001, passo 3 | Permite ao utilizador avaliar o intervalo escolhido. | Dado um intervalo entre 00:10 e 00:15, então o sistema apresenta uma duração de 5 segundos. |
| REQ-VID-EXT-007 | O sistema deve atualizar os fotogramas apresentados nas marcas, a duração do intervalo e o resumo do pedido sempre que os parâmetros relevantes forem alterados. | Deveria ter | Alterado | NOVO | UC-VID-001, FA1 | Mantém a informação apresentada coerente com as escolhas do utilizador. | Quando o utilizador altera o intervalo, então os fotogramas das marcas e a duração são atualizados; quando altera o número de fotogramas ou o formato, o resumo reflete os novos valores. |
| REQ-VID-EXT-008 | O sistema deve permitir ao utilizador definir o número de fotogramas a extrair do intervalo selecionado. | Deve ter | Mantido | NOVO | UC-VID-001, passo 4, RN1, RN7 | O número de fotogramas determina a quantidade de imagens produzidas e o espaçamento temporal. | Dado um intervalo válido, quando o utilizador indica 5 fotogramas, então o sistema regista essa quantidade no pedido. |
| REQ-VID-EXT-009 | O sistema deve permitir ao utilizador selecionar o formato de saída PNG ou JPEG. | Deve ter | Mantido | NOVO | UC-VID-001, passo 4, RN3 | Define o formato das imagens produzidas. | Quando o utilizador seleciona PNG ou JPEG, então o sistema regista o formato escolhido para a extração. |
| REQ-VID-EXT-010 | O sistema deve rejeitar intervalos cujo instante final seja igual ou anterior ao instante inicial, ou cujas marcas estejam fora da duração do vídeo. | Deve ter | Mantido | NOVO | UC-VID-001, passo 3, E4 | Impede pedidos com intervalos temporais inválidos. | Dado um intervalo cujo fim seja anterior ou igual ao início, então o sistema informa o utilizador e solicita a correção. |
| REQ-VID-EXT-011 | O sistema deve rejeitar números de fotogramas que não sejam inteiros positivos. | Deve ter | Refinado | NOVO | UC-VID-001, passo 4, E3, RN1 | Garante que a quantidade solicitada é válida. | Dado um número igual a zero, negativo ou não inteiro, então o sistema rejeita o valor e solicita a sua correção. |
| REQ-VID-EXT-012 | O sistema deve extrair o número de fotogramas solicitado, distribuindo-os uniformemente pelo intervalo, incluindo o instante inicial e excluindo o instante final. Se for solicitado um único fotograma, este deve corresponder ao instante inicial. | Deve ter | Mantido | NOVO | UC-VID-001, passo 6, RN7 | Define o comportamento central da extração. | Dado o intervalo entre 00:10 e 00:20 e 5 fotogramas, então os instantes pretendidos são 00:10, 00:12, 00:14, 00:16 e 00:18. |
| REQ-VID-EXT-013 | O sistema deve calcular o espaçamento temporal entre fotogramas consecutivos, dividindo a duração do intervalo pelo número de fotogramas solicitado, quando este for superior a um. | Deve ter | Mantido | NOVO | UC-VID-001, passo 4, RN7 | Permite calcular os instantes de extração e apresentar o espaçamento no resumo. | Dado um intervalo de 10 segundos e 5 fotogramas, então o espaçamento apresentado é de 2 segundos. |
| REQ-VID-EXT-014 | O sistema deve apresentar um resumo do pedido, incluindo o intervalo, a duração, o número de fotogramas, o espaçamento e o formato de saída, e solicitar confirmação ao utilizador. | Deve ter | Refinado | NOVO | UC-VID-001, passo 4 | Permite rever os parâmetros antes de iniciar a tarefa. | Dado um pedido válido, então o sistema apresenta os parâmetros selecionados e solicita confirmação. |
| REQ-VID-EXT-015 | O sistema deve rejeitar pedidos que excedam o limite de fotogramas do perfil: 10 para utilizadores registados e 20 para utilizadores premium. | Deve ter | Refinado | ALT | UC-VID-001, FA4, E3, RN1 | Respeita os limites definidos para cada perfil. | Dado um utilizador registado que solicita 11 fotogramas, ou um utilizador premium que solicita 21, então o sistema informa o limite aplicável e solicita a correção. |
| REQ-VID-EXT-016 | O sistema deve impedir a criação de uma tarefa quando o utilizador tiver esgotado a quota diária de extrações. | Deve ter | Refinado | ALT | UC-VID-001, E5, RN8 | Impede pedidos acima da quota diária permitida. | Dado um utilizador registado com 5 pedidos bem-sucedidos no dia, ou um utilizador premium com 10, então o sistema impede um novo pedido nesse dia. |
| REQ-VID-EXT-017 | O sistema deve permitir ao utilizador cancelar o pedido antes da confirmação, sem criar uma tarefa nem consumir quota diária. | Deve ter | Mantido | NOVO | UC-VID-001, FA2 | Permite desistir antes de iniciar o processamento. | Quando o utilizador cancela no ecrã de resumo, então regressa ao vídeo e não é criada nenhuma tarefa. |
| REQ-VID-EXT-018 | O sistema deve criar a tarefa de extração apenas após a confirmação do utilizador e a validação dos parâmetros e da quota diária. | Deve ter | Mantido | NOVO | UC-VID-001, passo 5, RN1, RN5, RN8 | Evita iniciar pedidos inválidos ou não autorizados. | Dado um pedido válido e confirmado, com quota disponível, então o sistema cria a tarefa. |
| REQ-VID-EXT-021 | O sistema deve guardar os fotogramas extraídos por ordem cronológica e associar a cada um o respetivo instante de origem. | Deve ter | Mantido | NOVO | UC-VID-001, passo 6 | Preserva a sequência e permite identificar a origem temporal de cada imagem. | Dada uma extração de 5 fotogramas, então as imagens ficam ordenadas por instante e cada uma tem o respetivo instante de origem. |
| REQ-VID-EXT-022 | O sistema deve permitir ao utilizador cancelar uma tarefa de extração em curso, descartando os fotogramas parciais. | Deve ter | Mantido | NOVO | UC-VID-001, FA3, E8 | Permite interromper o processamento sem guardar resultados incompletos. | Quando o utilizador cancela uma tarefa em curso, então a tarefa é interrompida e os fotogramas parciais não são adicionados ao projeto. |
| REQ-VID-EXT-023 | Após o cancelamento de uma tarefa, o sistema deve permitir ao utilizador retomar a configuração do pedido, preservando o intervalo, o número de fotogramas e o formato selecionados. | Deveria ter | Mantido | NOVO | UC-VID-001, FA3 | Evita que o utilizador tenha de introduzir novamente os parâmetros. | Após cancelar uma tarefa, então o utilizador pode voltar à configuração e encontrar os parâmetros anteriores. |
| REQ-VID-EXT-024 | O sistema deve disponibilizar os fotogramas extraídos como imagens do projeto, utilizáveis pelas ferramentas de processamento de imagens existentes. | Deve ter | Mantido | ALT | UC-VID-001, passo 7, RN4 | Integra a funcionalidade de vídeo com as ferramentas de imagem existentes. | Após uma extração bem-sucedida, os fotogramas aparecem como imagens do projeto e podem ser usados por uma ferramenta de processamento de imagem. |
| REQ-VID-EXT-025 | O sistema deve contabilizar cada pedido de extração concluído com sucesso como uma operação da quota diária do utilizador, independentemente do número de fotogramas produzidos. | Deve ter | Refinado | ALT | UC-VID-001, passo 7, RN5, RN8, A3 | Define a contabilização dos pedidos de extração. | Dado um pedido que produza 5 fotogramas, então a quota diária consumida aumenta em uma operação. |
| REQ-VID-EXT-026 | O sistema não deve consumir quota diária quando um pedido de extração é cancelado ou falha. | Deve ter | Mantido | ALT | UC-VID-001, FA2, FA3, E7, E8, E9, RN5 | Evita contabilizar operações não concluídas com sucesso. | Dado um pedido cancelado ou falhado, então a quota diária consumida permanece inalterada. |
| REQ-VID-EXT-027 | O sistema deve informar o utilizador quando a extração for concluída com sucesso. | Deve ter | Mantido | NOVO | UC-VID-001, passo 7 | Confirma a conclusão da operação. | Quando todos os fotogramas são extraídos e guardados com sucesso, então o sistema apresenta uma mensagem de conclusão. |
| REQ-VID-EXT-028 | O sistema deve informar o utilizador quando o vídeo estiver indisponível e impedir o início da extração. | Deve ter | Mantido | NOVO | UC-VID-001, E2, E9 | Evita iniciar uma operação sobre um vídeo inacessível. | Dado um vídeo indisponível, então o sistema informa o utilizador e não permite iniciar a extração. |
| REQ-VID-EXT-029 | O sistema deve informar o utilizador quando não conseguir ler ou descodificar o vídeo, sem adicionar fotogramas parciais ao projeto. | Deve ter | Mantido | NOVO | UC-VID-001, E7, E9, Garantia Mínima | Mantém o projeto consistente perante vídeos ilegíveis. | Dado um vídeo que não possa ser lido, então a tarefa falha, o utilizador é informado e não são adicionadas imagens ao projeto. |
| REQ-VID-EXT-030 | O sistema deve informar o utilizador quando a extração falhar, sem adicionar resultados parciais ao projeto e permitindo uma nova tentativa. | Deve ter | Mantido | NOVO | UC-VID-001, E7, Garantia Mínima | Permite identificar a falha e tentar novamente. | Dada uma falha durante a extração, então o sistema informa o utilizador, não guarda resultados parciais e permite iniciar um novo pedido. |
| REQ-VID-EXT-032 | O sistema deve informar o utilizador quando ocorrer uma falha ao guardar os fotogramas no projeto, sem deixar resultados parciais. | Deve ter | Mantido | NOVO | UC-VID-001, E7, Garantia Mínima | Evita resultados incompletos após uma falha de gravação. | Dada uma falha ao guardar os fotogramas, então o sistema informa o utilizador e nenhum resultado parcial fica disponível no projeto. |
| REQ-VID-EXT-034 | O sistema deve eliminar os ficheiros temporários associados à extração, no máximo uma hora após o término da tarefa, quer esta seja concluída, cancelada ou falhada. | Deveria ter | Mantido | NOVO | UC-VID-001, FA3, Garantia de Sucesso, Garantia Mínima | Evita a acumulação de ficheiros temporários. | Dada uma tarefa terminada, então os respetivos ficheiros temporários são eliminados no prazo máximo de uma hora. |
| REQ-VID-EXT-039 | O sistema deve apresentar o estado da tarefa como em fila, em processamento, concluída, falhada ou cancelada, conforme aplicável. | Deve ter | Mantido | NOVO | UC-VID-001, passos 5–7, FA3, FA5, A2 | Permite acompanhar a tarefa durante o processamento assíncrono. | Quando o estado da tarefa muda, então o estado apresentado ao utilizador é atualizado em conformidade. |

## 4.1.2 Requisitos Não Funcionais e de Qualidade

Classifique requisitos de qualidade segundo a ISO/IEC 25010. Registe regras de negócio e restrições funcionais na tabela 4.1.1; não as classifique como qualidade sem justificação. Para cada requisito de qualidade, distinga o que o MVP deve cumprir do alvo de produção.

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
|---|---|---|---|---|---|---|---|
| REQ-VID-EXT-019 | O sistema deve apresentar o estado inicial da tarefa num prazo máximo de 2 segundos após a confirmação do utilizador. | Eficiência de desempenho | ≤ 2 s | ≤ 1 s | Mantido | UC-VID-001, passo 5 | Em 10 pedidos válidos consecutivos, o estado inicial é apresentado dentro do limite definido para cada ambiente. |
| REQ-VID-EXT-020 | O sistema deve apresentar o progresso da tarefa em curso, incluindo a percentagem e o número de fotogramas processados, e atualizar essa informação regularmente. | Usabilidade | Atualização a cada ≤ 5 s | Atualização a cada ≤ 1 s | Refinado | UC-VID-001, passos 5–6, A2 | Numa tarefa que demore mais de 5 segundos, o progresso e o número de fotogramas processados são apresentados e atualizados dentro do intervalo definido para cada ambiente. |
| REQ-VID-EXT-031 | O sistema deve guardar os fotogramas no projeto de forma atómica, disponibilizando todos os resultados do pedido ou nenhum. | Fiabilidade | Obrigatório | Obrigatório | Mantido | UC-VID-001, E7, Garantia Mínima | Se ocorrer uma falha durante a gravação de um pedido de 5 fotogramas, nenhum dos 5 fica disponível no projeto. |
| REQ-VID-EXT-033 | O sistema deve manter o vídeo original inalterado após uma extração concluída, cancelada ou falhada. | Fiabilidade | Obrigatório | Obrigatório | Mantido | UC-VID-001, Garantia de Sucesso, Garantia Mínima | A comparação do ficheiro original antes e depois da operação confirma que o seu conteúdo não foi alterado.   |
| REQ-VID-EXT-036 | O sistema deve suportar várias tarefas de extração em simultâneo e colocar os pedidos adicionais em fila de espera. | Eficiência de desempenho — capacidade | Meta proposta: 5 tarefas simultâneas | Meta proposta: 50 tarefas simultâneas | Mantido, sujeito a validação | UC-VID-001, passo 5, A2 | Ao submeter 6 tarefas simultaneamente no MVP, 5 são processadas e a restante fica em fila. O limite de produção deve ser confirmado através de testes de carga. |
| REQ-VID-EXT-037 | O sistema deve conseguir extrair fotogramas dos formatos de vídeo aceites pelo carregamento do PictuRAS: MP4, WEBM e MOV, desde que o vídeo esteja disponível e seja descodificável. | Compatibilidade | MP4, WEBM e MOV | Os mesmos formatos, acompanhando alterações ao carregamento | Refinado | UC-VID-001, passo 1, A1, A4 | São testados vídeos MP4, WEBM e MOV aceites pelo carregamento. Para cada vídeo descodificável, a extração termina com sucesso. |
| REQ-VID-EXT-038 | A funcionalidade de extração de fotogramas deve integrar-se com as ferramentas de imagem existentes sem alterar o seu comportamento. | Manutenibilidade — modularidade | Os testes existentes continuam a passar | A ferramenta de vídeo pode evoluir sem alterar as ferramentas de imagem existentes | Mantido | UC-VID-001, RN4 | Os testes das ferramentas de imagem são executados antes e depois da integração e os resultados mantêm-se consistentes. |

> O alvo de produção é uma referência para a evolução futura, não um critério de aprovação do MVP. Use valores verificáveis nos dois alvos sempre que aplicável; justifique quando o alvo for qualitativo ou igual nos dois contextos.

## 4.1.3 Verificação da completude e dos limites do âmbito

A tabela seguinte verifica a aplicabilidade dos principais tópicos à funcionalidade «Extrair sequência de fotogramas», tendo em conta o caso de uso UC-VID-001 e os requisitos definidos nas secções 4.1.1 e 4.1.2.

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
|---|---|---|---|
| Formato, codec, duração e dimensão do vídeo | Parcialmente | A validação do formato, do tamanho e da duração do vídeo pertence ao processo de carregamento. Neste caso de uso, o sistema deve conseguir ler e descodificar o vídeo selecionado, respeitar os formatos aceites pelo PictuRAS e produzir fotogramas no formato de saída escolhido. Os fotogramas são extraídos à resolução original do vídeo, não sendo introduzida uma operação de redimensionamento. | 009, 028, 029, 032, 033, 037 |
| Estado, progresso, cancelamento e resultado | Sim | O sistema deve apresentar o estado da tarefa, permitir acompanhar o progresso, aceitar o cancelamento antes da confirmação e durante o processamento e disponibilizar os resultados após uma extração bem-sucedida. Se o utilizador sair da página, a tarefa continua no servidor e o seu estado pode ser consultado posteriormente. | 017, 018, 019, 020, 022, 023, 024, 027, 039 |
| Falhas durante o processamento | Sim | Devem ser tratadas as falhas de leitura ou descodificação do vídeo, de extração e de gravação dos fotogramas. Em caso de falha ou cancelamento, não podem ficar resultados parciais disponíveis no projeto, o vídeo original deve permanecer inalterado e a quota diária não deve ser consumida. | 026, 029, 030, 031, 032, 033 |
| Persistência e expiração dos ficheiros | Sim | Os fotogramas extraídos com sucesso devem ser guardados como imagens do projeto e ficar disponíveis de acordo com as permissões aplicáveis. Os ficheiros temporários associados à tarefa devem ser eliminados. O vídeo original não pode ser alterado. | 021, 024, 031, 033, 034, 038 |
| Perfis e contagem de operações | Sim | A funcionalidade está disponível para utilizadores registados e premium. O limite por pedido é de 10 fotogramas para utilizadores registados e 20 para utilizadores premium. A quota diária é de 5 pedidos para utilizadores registados e 10 para utilizadores premium. Cada pedido concluído com sucesso consome uma operação, independentemente do número de fotogramas; pedidos cancelados ou falhados não consomem quota. | 003, 015, 016, 018, 025, 026 |
| Permissões de acesso | Sim | O utilizador só pode selecionar vídeos e aceder aos resultados de extração para os quais tenha permissões. Os fotogramas guardados devem respeitar as regras de acesso do projeto de origem. | 001, 024, 028, 038 |
| Encadeamento de ferramentas e processamento em lote | Não, como funcionalidade direta | A extração de fotogramas não deve ser integrada como uma etapa de um encadeamento nem permitir processar vários vídeos num único pedido. Os fotogramas produzidos são imagens normais do PictuRAS e podem, depois de guardados, ser utilizados pelas ferramentas de processamento de imagens, incluindo as funcionalidades existentes de encadeamento e processamento em lote. | 024, 038 |

**Evolução:** *Mantido* = requisito preservado; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

## 4.2 Impacto no sistema existente

Atualize a análise do Exercício 1 se algum requisito novo ou refinado a alterar. Inclua requisitos NOVO que interajam com mecanismos existentes.

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
|---|---|---|---|
| Biblioteca de vídeos | Estender | Deve permitir selecionar um vídeo disponível num projeto ao qual o utilizador tenha acesso, apresentar o vídeo com a respetiva linha temporal e identificar situações em que o vídeo esteja indisponível. A extração deve respeitar os formatos aceites pelo carregamento. | 001, 002, 028, 037, 038 |
| Interface de utilizador | Estender | Devem ser acrescentados os controlos para definir o intervalo, visualizar os fotogramas das marcas temporais, consultar a duração, escolher o número de fotogramas e o formato de saída, rever o resumo e confirmar o pedido. A interface deve ainda apresentar o estado, o progresso, as mensagens de sucesso e os avisos de erro. | 003–020, 023, 027–030, 032, 039 |
| Gestão de tarefas de processamento | Estender | Deve suportar um novo tipo de tarefa para extração de fotogramas, incluindo criação após confirmação, estados, atualização do progresso, cancelamento, tratamento de falhas e continuação do processamento quando o utilizador abandona a página. A infraestrutura existente pode ser reutilizada, caso suporte estes mecanismos. | 018–020, 022, 023, 026, 029–032, 039 |
| Gestão de perfis e quotas | Alterar | Deve verificar o perfil antes de permitir a operação, aplicar os limites de fotogramas por pedido e impedir a criação de tarefas quando a quota diária estiver esgotada. Cada pedido concluído com sucesso consome uma operação; pedidos cancelados ou falhados não consomem quota. | 003, 015, 016, 018, 025, 026 |
| Gestão de projetos e imagens | Alterar | Deve permitir adicionar os fotogramas extraídos ao projeto como imagens normais, disponibilizando-os às ferramentas de processamento existentes. A gravação deve ser atómica, de modo a disponibilizar todos os fotogramas do pedido ou nenhum, e deve respeitar as permissões de acesso ao projeto. | 021, 024, 031, 032, 038 |
| Ferramentas de processamento de imagens existentes | Manter | Não devem necessitar de alterações funcionais para processar os fotogramas extraídos. A integração deve ser verificada através dos testes existentes, garantindo que o seu comportamento se mantém. | 024, 038 |
| Encadeamento de ferramentas e processamento em lote | Manter | A extração de fotogramas não será acrescentada ao encadeamento nem ao processamento em lote. Os resultados poderão ser utilizados posteriormente por essas funcionalidades como imagens normais do PictuRAS. | 024, 038 |
| Armazenamento e ficheiros temporários | Estender | Deve guardar os fotogramas finais e os respetivos instantes de origem, eliminar os resultados parciais em caso de cancelamento ou falha e remover os ficheiros temporários  após o término da tarefa. | 021, 026, 031, 032, 034 |
| Controlo de acessos | Estender | As regras de autorização devem aplicar-se à seleção dos vídeos e ao acesso aos fotogramas resultantes. O sistema deve impedir o acesso a vídeos e resultados de projetos para os quais o utilizador não tenha permissões. | 001, 024, 028, 038 |
| Ambiente de execução e descodificação de vídeo | Estender | A infraestrutura de execução deve suportar a leitura e a descodificação dos formatos de vídeo aceites pelo PictuRAS. A dependência necessária à extração deve estar disponível no ambiente de execução, sem exigir passos manuais adicionais de instalação. | 029, 037, 038 |

A análise considera que os mecanismos existentes podem ser reutilizados sempre que forem compatíveis com os requisitos definidos. A necessidade de criar ou modificar componentes internos deve ser confirmada através da análise da implementação atual do PictuRAS.

## 4.3 Matriz de Rastreabilidade Atualizada

Estenda a matriz do Exercício 1. Um requisito funcional deve apontar para um elemento do caso de uso ou regra de negócio. Um requisito de qualidade pode apontar para uma decisão de qualidade `DQ-nnn`, registada na secção 2.7 como assunção/decisão, ou na lista de decisões abaixo. Decisões com impacto funcional devem também ser refletidas no caso de uso ou justificadas como extensão do âmbito.

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
|---|---|---|
| Passo 1 | Selecionar o vídeo e apresentar o vídeo e a linha temporal | 001, 002, 028, 037, 038 |
| Passo 2 | Selecionar a operação «Extrair sequência de fotogramas» | 003 |
| Passo 3 | Definir o início e o fim do intervalo e visualizar os fotogramas das marcas | 004, 005, 006, 007, 010 |
| Passo 4 | Definir o número de fotogramas e o formato, validar os parâmetros, calcular o espaçamento e apresentar o resumo para confirmação | 007–016 |
| Passo 5 | Criar a tarefa após confirmação e apresentar o estado e o progresso | 018, 019, 020, 039 |
| Passo 6 | Extrair e guardar os fotogramas pela ordem temporal, associando o instante de origem | 012, 013, 021, 029, 030, 031, 032, 033, 034, 037 |
| Passo 7 | Disponibilizar os fotogramas como imagens do projeto, atualizar a quota e informar o utilizador | 024, 025, 026, 027, 034, 038 |
| FA1 | Alterar o intervalo ou outros parâmetros do pedido | 005, 006, 007, 010, 013, 014 |
| FA2 | Cancelar o pedido antes da confirmação | 017, 026 |
| FA3 | Cancelar uma tarefa durante o processamento e preservar os parâmetros para uma nova tentativa | 022, 023, 026, 031, 034 |
| FA4 | Corrigir um pedido que excede o limite de fotogramas do perfil | 015 |
| FA5 | Abandonar a página durante o processamento e consultar o estado posteriormente | 020, 039 |
| E1 | Utilizador sem sessão iniciada ou sem perfil elegível | 003 |
| E2 | Utilizador sem permissão para aceder ao vídeo ou ao projeto | 001, 024, 028, 038 |
| E3 | Número de fotogramas inválido ou acima do limite do perfil | 011, 015 |
| E4 | Intervalo temporal inválido | 010 |
| E5 | Quota diária esgotada | 016, 018 |
| E6 | Formato de saída não suportado | 009 |
| E7 | Falha durante a extração | 026, 029, 030, 031, 032, 033 |
| E8 | Cancelamento antes de a tarefa terminar | 022, 026, 031, 034 |
| E9 | Vídeo indisponível ou sem dados temporais adequados | 028, 029 |
| Garantia de sucesso | Fotogramas disponíveis como imagens do projeto, vídeo original inalterado, quota atualizada e ficheiros temporários eliminados | 021, 024, 025, 033, 034, 038 |
| Garantia mínima | Ausência de resultados parciais, quota inalterada em caso de falha ou cancelamento, vídeo original inalterado e informação do problema ao utilizador | 022, 026, 029, 030, 031, 032, 033, 034 |
| RN1 | Limite de fotogramas por pedido: 10 para utilizadores registados e 20 para utilizadores premium | 003, 015 |
| RN2 | Acesso à funcionalidade reservado a utilizadores registados e premium com sessão iniciada e permissões no projeto | 001, 003, 018, 038 |
| RN3 | Formatos de saída permitidos: PNG e JPEG | 009 |
| RN4 | Os fotogramas extraídos são imagens normais do PictuRAS, utilizáveis pelas ferramentas de imagem existentes | 024, 038 |
| RN5 | Cada pedido concluído com sucesso consome uma operação da quota; pedidos cancelados ou falhados não consomem quota | 025, 026 |
| RN6 | O utilizador só pode aceder a vídeos e resultados para os quais tenha permissão | 001, 024, 028, 038 |
| RN7 | Fotogramas distribuídos uniformemente pelo intervalo, incluindo o início e excluindo o fim; um único fotograma corresponde ao instante inicial | 008, 011, 012, 013 |
| RN8 | Quota diária de 5 pedidos para utilizadores registados e 10 para utilizadores premium | 016, 018, 025, 026 |
| A1 | O vídeo já foi carregado e está disponível num projeto | 001, 002, 028, 037 |
| A2 | A extração pode demorar o suficiente para justificar processamento assíncrono e apresentação do estado da tarefa | 018, 019, 020, 039 |
| A3 | Cada pedido concluído com sucesso conta como uma operação, independentemente do número de fotogramas | 025, 026 |
| A4 | O vídeo contém dados temporais e pode ser lido e descodificado para permitir a extração | 028, 029, 030, 037 |
