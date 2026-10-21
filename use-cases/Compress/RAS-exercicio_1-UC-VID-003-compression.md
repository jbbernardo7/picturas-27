# 📝 Exercício 1 — Template de Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | PL5-G06 |
| **Autores** | Vítor Mina (pg64044); |
| **Data** | 2026-10-07 |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Comprimir vídeo (reduzir o tamanho do ficheiro) |
| **Perfil(s) de utilizador abrangido(s)** | Registado e Premium. O perfil Registado pode utilizar a funcionalidade dentro do limite diário de operações existente, enquanto o perfil Premium a pode utilizar sem essa limitação. O processamento de vídeo é mais exigente em recursos do que o de imagens, pelo que o perfil anónimo não é abrangido (ver Q3). |

**Justificação no contexto do MVP** *(2–3 linhas)*

Comprimir um vídeo permite ao utilizador reduzir o espaço ocupado na biblioteca e facilitar a partilha ou o envio do ficheiro, uma necessidade muito comum com vídeos grandes. Com parâmetros simples (nível de compressão e resolução), valida de ponta a ponta o essencial do suporte a vídeo no MVP: carregamento, fila de processamento assíncrono, estados da operação, armazenamento do resultado e quotas por perfil.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-003 |
| **Nome** | Comprimir vídeo |
| **Versão** | v1.0 |
| **Autor** | Vítor Mina |
| **Data** | 2026-10-07 |
| **Objetivo** | Permitir ao utilizador reduzir o tamanho de um vídeo previamente carregado, escolhendo o nível de compressão e a resolução de saída, e obter um novo vídeo mais pequeno sem perder o vídeo original. |
| **Âmbito** | Módulo de processamento de vídeo do PictuRAS |
| **Ator Principal** | Utilizador Registado ou Premium |
| **Stakeholders e Interesses** | - **Utilizador**: pretende um ficheiro mais pequeno para poupar espaço ou facilitar a partilha, controlando o nível de compressão e a resolução, e conservar o vídeo original<br>- **Proprietário do Sistema**: pretende reduzir o espaço de armazenamento ocupado pelos utilizadores e controlar o custo de processamento através das quotas por perfil<br>- **Equipa de Desenvolvimento**: valida o processamento assíncrono de vídeo e a integração com a fila de processamento, o armazenamento e as quotas existentes |
| **Pré-condições** | - O utilizador tem sessão iniciada<br>- O utilizador possui um vídeo na sua biblioteca<br>- O vídeo foi carregado com sucesso e está disponível para processamento |
| **Trigger** | O utilizador seleciona um vídeo da sua biblioteca e escolhe a opção **Comprimir vídeo**. |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a sua biblioteca e seleciona um vídeo | O sistema apresenta os detalhes do vídeo (incluindo duração, tamanho e resolução) e as operações disponíveis |
| 2 | O utilizador seleciona a operação **Comprimir vídeo** | O sistema apresenta o formulário de compressão: nível de compressão (Baixa, Média ou Alta) e resolução de saída (original, 1080p, 720p ou 480p) |
| 3 | O utilizador escolhe o nível de compressão e a resolução de saída | O sistema valida as opções e apresenta uma estimativa do tamanho do vídeo resultante |
| 4 | O utilizador confirma a operação | O sistema verifica a quota do utilizador, cria uma nova operação de processamento associada ao vídeo selecionado e regista as opções definidas |
| 5 | — | O sistema coloca a operação na fila de processamento e apresenta o seu estado (*Pendente*) ao utilizador |
| 6 | O utilizador consulta o estado da operação | O sistema apresenta o estado atual (*Pendente*, *Em processamento*, *Concluída*, *Falhada* ou *Cancelada*) e, durante o processamento, o progresso |
| 7 | — | O sistema processa o vídeo, reduzindo o tamanho do ficheiro de acordo com as opções escolhidas e mantendo a duração, o áudio e a proporção do vídeo original |
| 8 | — | Após o processamento, o sistema guarda o vídeo resultante na biblioteca do utilizador, como novo vídeo, marca a operação como *Concluída* e apresenta o tamanho do vídeo original e do vídeo resultante |
| 9 | O utilizador seleciona o vídeo resultante | O sistema permite ao utilizador reproduzir, consultar e descarregar o vídeo comprimido |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Resolução de saída inválida | Se o utilizador escolher uma resolução de saída superior à do vídeo original → o sistema rejeita a opção, indica o motivo e solicita ao utilizador que escolha outra resolução; o fluxo retoma no passo 3. |
| FA2 – Cancelamento do processamento | Se o utilizador cancelar a operação enquanto esta estiver *Pendente* ou *Em processamento* → o sistema interrompe o processamento, marca a operação como *Cancelada*, descarta quaisquer dados parciais e não disponibiliza um vídeo resultante. |
| FA3 – Alteração das opções antes de confirmar | Antes de confirmar a operação (passo 4), o utilizador altera o nível de compressão ou a resolução de saída → o sistema volta a validar as opções e atualiza a estimativa do tamanho; o fluxo continua no passo 4. |
| FA4 – Opções por omissão | Se o utilizador não alterar as opções → o sistema aplica o nível de compressão Média e a resolução original, e o fluxo continua no passo 4. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| O formato ou codec do vídeo não é suportado | O sistema rejeita a operação antes de a colocar na fila e informa o utilizador de que o formato ou codec do vídeo não é suportado |
| O vídeo ainda está a ser carregado ou processado por outra operação | A opção **Comprimir vídeo** aparece indisponível, com a indicação de que só fica disponível quando o vídeo estiver pronto para processamento |
| O utilizador Registado atingiu o limite diário de operações | O sistema impede a criação da operação e informa o utilizador de que o limite diário foi atingido; as opções escolhidas não são perdidas enquanto o utilizador permanecer no formulário |
| A duração ou o tamanho do vídeo excede o limite de processamento do perfil | O sistema rejeita a operação e informa o utilizador do limite aplicável ao seu perfil |
| O processamento falha a meio da execução | O sistema marca a operação como *Falhada*, informa o utilizador, descarta os dados parciais, não disponibiliza um vídeo resultante incompleto e não contabiliza a operação na quota diária do utilizador |
| Não há espaço de armazenamento suficiente para guardar o vídeo resultante | O sistema marca a operação como *Falhada*, informa o utilizador do motivo e mantém o vídeo original inalterado |
| O vídeo resultante não é mais pequeno do que o original | O sistema marca a operação como *Falhada*, informa o utilizador de que a compressão não reduziu o tamanho do ficheiro, não guarda o vídeo resultante e não contabiliza a operação na quota diária |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | É disponibilizado na biblioteca do utilizador um novo vídeo com tamanho inferior ao do original, com a resolução escolhida e com a mesma duração, áudio e proporção do original; o vídeo original permanece disponível e inalterado; a operação fica registada com o estado *Concluída*; se o utilizador é Registado, a operação é contabilizada na quota diária |
| Garantia Mínima | Em caso de falha ou cancelamento, o vídeo original permanece disponível e inalterado, nenhum vídeo parcial ou incompleto é disponibilizado, a operação fica registada com o respetivo estado (*Falhada* ou *Cancelada*) e o utilizador é informado do resultado |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | A funcionalidade só está disponível para utilizadores Registados e Premium |
| RN2 | O nível de compressão tem três valores possíveis: Baixa, Média e Alta |
| RN3 | A resolução de saída pode ser a original, 1080p, 720p ou 480p, e nunca pode ser superior à resolução do vídeo original |
| RN4 | Se o utilizador não escolher opções, aplica-se o nível Média e a resolução original |
| RN5 | O vídeo resultante mantém a duração, o áudio e a proporção do vídeo original |
| RN6 | O vídeo original não é alterado nem substituído pelo resultado; o resultado é sempre guardado como um novo vídeo |
| RN7 | Cada operação de compressão realizada por um utilizador Registado e concluída com sucesso conta para o limite diário de 5 operações |
| RN8 | O utilizador Premium não está sujeito ao limite diário de operações aplicável ao perfil Registado |
| RN9 | Uma operação falhada ou cancelada não é contabilizada na quota diária |
| RN10 | O vídeo resultante só é guardado se o seu tamanho for inferior ao do vídeo original |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O vídeo já foi carregado (UC-VID-001) e está disponível na biblioteca do utilizador |
| A2 | O sistema consegue determinar o tamanho, a duração e a resolução do vídeo antes de apresentar o formulário |
| A3 | Existe uma fila de processamento e um mecanismo de estados de operação que podem ser reutilizados para operações de vídeo |
| A4 | A estimativa do tamanho do vídeo resultante é aproximada e é calculada de forma síncrona (< 1 s), sem processar o vídeo completo |
| A5 | O formato do vídeo resultante é o mesmo do vídeo original |
| A6 | O utilizador não pode editar uma operação já confirmada; para alterar as opções tem de criar uma nova operação sobre o vídeo original |
| A7 | O sistema possui armazenamento suficiente para guardar o vídeo resultante sem alterar o vídeo original |
| A8 | O utilizador aceita que a compressão implique alguma perda de qualidade de imagem |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | Quais os formatos e codecs de vídeo suportados pelo MVP? |
| Q2 | Qual a duração e o tamanho máximos de vídeo que podem ser processados, e diferem por perfil? |
| Q3 | O perfil anónimo deve ter acesso à funcionalidade? |
| Q4 | O utilizador deve poder indicar um tamanho alvo (por exemplo, 50 MB) em vez de escolher um nível de compressão? |
| Q5 | O utilizador deve poder escolher o formato de saída? |
| Q6 | Qual a precisão exigida à estimativa do tamanho do vídeo resultante? |
| Q7 | Uma operação falhada ou cancelada deve realmente não contar para a quota diária (RN9), ou deve contar após o início do processamento? |
| Q8 | Esta operação pode ser encadeada com outras (por exemplo, recortar e depois comprimir) numa única submissão? |
| Q9 | O utilizador deve poder optar por substituir o vídeo original pelo comprimido para libertar espaço? |
| Q10 | Uma operação cujo resultado não é mais pequeno do que o original (RN10) deve ser registada como *Falhada* ou deve ter um estado próprio? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Claude | Primeira versão do caso de uso (fluxos, exceções, regras de negócio, assunções e questões em aberto), a partir do template e dos exemplos; adaptação do caso de uso à funcionalidade de compressão; derivação da primeira versão da secção 4 (requisitos, impacto e matriz de rastreabilidade) | A equipa escolheu a funcionalidade, reviu criticamente o conteúdo gerado e fez ajustes e correções ao longo do processo, verificando a coerência com os exemplos e com as regras do PictuRAS |

---

## ✅ Lista de verificação antes de entregar (Exercício 1)

- [x] Secções 0 a 3 preenchidas e texto de ajuda (`>` e `{…}`) removido.
- [x] Funcionalidade de vídeo escolhida **e justificada** no contexto do MVP.
- [x] Ator principal identificado, com o respetivo perfil.
- [x] Caso de uso com fluxo principal, **≥1 fluxo alternativo** e **≥1 exceção específica de vídeo**.
- [x] Pós-condições com garantia de sucesso **e** garantia mínima.
- [x] Regras de negócio e restrições preenchidas.
- [x] Assunções e questões em aberto registadas.
- [x] Utilização de agentes de IA documentada.

---
---

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| REQ-VID-COMP-001 | O sistema deve permitir ao utilizador Registado ou Premium selecionar a operação **Comprimir vídeo** sobre um vídeo da sua biblioteca. | F | Deve ter | NOVO | Trigger, Passos 1–2, RN1 | Dado um vídeo pronto, quando o utilizador o seleciona, então a operação está disponível. |
| REQ-VID-COMP-002 | O sistema deve negar o acesso à operação **Comprimir vídeo** ao utilizador anónimo. | NF (Segurança) | Deve ter | ALT | RN1 | Dado um utilizador anónimo, quando tenta aceder à operação, então o acesso é negado. |
| REQ-VID-COMP-003 | O sistema deve permitir apenas ao proprietário do vídeo criar operações de compressão sobre esse vídeo. | NF (Segurança) | Deve ter | NOVO | Pré-condições | Dado um vídeo de outro utilizador, quando é pedida a operação, então esta é recusada. |
| REQ-VID-COMP-004 | O sistema deve apresentar os detalhes do vídeo selecionado, incluindo a duração, o tamanho e a resolução, e as operações disponíveis. | F | Deve ter | NOVO | Passo 1, A2 | Dado um vídeo selecionado, então duração, tamanho, resolução e operações são apresentados. |
| REQ-VID-COMP-005 | O sistema deve apresentar o formulário de compressão com as opções de nível de compressão e de resolução de saída. | F | Deve ter | NOVO | Passo 2 | Dada a operação escolhida, então o formulário mostra ambas as opções. |
| REQ-VID-COMP-006 | O sistema deve permitir ao utilizador escolher o nível de compressão entre Baixa, Média e Alta. | F | Deve ter | NOVO | Passo 3, RN2 | Dado o formulário, então apenas esses três níveis estão disponíveis e o escolhido fica registado. |
| REQ-VID-COMP-007 | O sistema deve permitir ao utilizador escolher a resolução de saída entre a original, 1080p, 720p e 480p. | F | Deve ter | NOVO | Passo 3, RN3 | Dado um vídeo 1080p, então as quatro opções são apresentadas e a escolhida fica registada. |
| REQ-VID-COMP-008 | O sistema deve rejeitar uma resolução de saída superior à resolução do vídeo original. | F | Deve ter | NOVO | Passo 3, FA1, RN3 | Dado um vídeo 720p, quando se escolhe 1080p, então a opção é rejeitada. |
| REQ-VID-COMP-009 | O sistema deve indicar o motivo da rejeição da resolução de saída e permitir ao utilizador escolher outra. | F | Deve ter | NOVO | FA1 | Dada uma resolução rejeitada, então o motivo é apresentado e pode ser escolhida outra. |
| REQ-VID-COMP-010 | O sistema deve aplicar o nível de compressão Média e a resolução original quando o utilizador não alterar as opções. | F | Deve ter | NOVO | FA4, RN4 | Dado nenhuma opção escolhida, então a operação é criada com nível Média e resolução original. |
| REQ-VID-COMP-011 | O sistema deve permitir ao utilizador alterar o nível de compressão e a resolução de saída antes de confirmar a operação. | F | Deveria ter | NOVO | FA3 | Dadas opções escolhidas, quando são alteradas antes de confirmar, então as novas opções ficam registadas. |
| REQ-VID-COMP-012 | O sistema deve apresentar uma estimativa do tamanho do vídeo resultante para as opções escolhidas. | F | Deveria ter | NOVO | Passo 3 | Dadas opções válidas, então é apresentada uma estimativa de tamanho. |
| REQ-VID-COMP-013 | O sistema deve atualizar a estimativa do tamanho quando o utilizador alterar as opções. | F | Deveria ter | NOVO | FA3 | Dada uma alteração do nível, então o valor estimado é atualizado. |
| REQ-VID-COMP-014 | O sistema deve calcular a estimativa do tamanho em menos de 1 s. | NF (Desempenho) | Deveria ter | NOVO | Passo 3, A4 | Em 20 execuções, o tempo é < 1 s em todas. |
| REQ-VID-COMP-015 | O sistema deve permitir ao utilizador confirmar a operação de compressão. | F | Deve ter | NOVO | Passo 4 | Dadas opções válidas, quando se confirma, então a operação é submetida. |
| REQ-VID-COMP-016 | O sistema deve criar uma operação de processamento associada ao vídeo selecionado, registando as opções definidas. | F | Deve ter | NOVO | Passo 4 | Dada a confirmação, então existe uma operação com o vídeo e as opções. |
| REQ-VID-COMP-017 | O sistema deve verificar a quota do utilizador antes de criar a operação. | F | Deve ter | ALT | Passo 4 | Dado um utilizador Registado, quando confirma, então a quota é consultada antes da criação. |
| REQ-VID-COMP-018 | O sistema deve impedir a criação da operação e informar o utilizador quando o utilizador Registado tiver atingido o limite diário de 5 operações. | F | Deve ter | ALT | Exceção 3, RN7 | Dado um Registado com 5 operações concluídas hoje, quando confirma, então é impedido e informado. |
| REQ-VID-COMP-019 | O sistema deve manter as opções escolhidas no formulário quando a operação for impedida por limite diário. | F | Deveria ter | NOVO | Exceção 3 | Dado o bloqueio por quota, então as opções continuam no formulário. |
| REQ-VID-COMP-020 | O sistema deve rejeitar, antes de a colocar na fila, a operação sobre um vídeo de formato ou codec não suportado, informando o utilizador. | F | Deve ter | NOVO | Exceção 1 (depende de Q1) | Dado um vídeo de codec não suportado, então a operação não entra na fila e há mensagem. |
| REQ-VID-COMP-021 | O sistema deve rejeitar a operação sobre um vídeo cuja duração ou tamanho exceda o limite do perfil do utilizador, informando-o do limite aplicável. | F | Deve ter | ALT | Exceção 4 (depende de Q2) | Dado um vídeo acima do limite do perfil, então é rejeitado com indicação do limite. |
| REQ-VID-COMP-022 | O sistema deve apresentar a opção **Comprimir vídeo** como indisponível enquanto o vídeo estiver a ser carregado ou processado por outra operação. | F | Deve ter | NOVO | Exceção 2, Pré-condições | Dado um vídeo em processamento, então a opção surge indisponível com explicação. |
| REQ-VID-COMP-023 | O sistema deve colocar a operação na fila de processamento e apresentar o estado *Pendente* ao utilizador. | F | Deve ter | ALT | Passo 5, A3 | Dada uma operação criada, então está na fila e o estado mostrado é *Pendente*. |
| REQ-VID-COMP-024 | O sistema deve apresentar o estado atual da operação (*Pendente*, *Em processamento*, *Concluída*, *Falhada* ou *Cancelada*). | F | Deve ter | ALT | Passo 6 | Dada uma operação em cada estado, então esse estado é apresentado. |
| REQ-VID-COMP-025 | O sistema deve apresentar o progresso da operação durante o processamento. | F | Deveria ter | NOVO | Passo 6 | Dada uma operação *Em processamento*, então o progresso é visível. |
| REQ-VID-COMP-026 | O sistema deve reduzir o tamanho do ficheiro de vídeo de acordo com o nível de compressão e a resolução de saída escolhidos. | F | Deve ter | NOVO | Passo 7 | Dado um vídeo processado com as opções X, então o resultado tem a resolução escolhida e o tamanho reduzido. |
| REQ-VID-COMP-027 | O sistema deve produzir o vídeo resultante com a resolução de saída escolhida. | F | Deve ter | NOVO | Passo 7, RN3 | Dada a resolução 720p, então o resultado tem 720p. |
| REQ-VID-COMP-028 | O sistema deve manter a duração do vídeo original no vídeo resultante. | NF (Fiabilidade) | Deve ter | NOVO | RN5, Pós-condição de sucesso | A duração do resultado é igual à do original. |
| REQ-VID-COMP-029 | O sistema deve manter o áudio do vídeo original no vídeo resultante. | NF (Fiabilidade) | Deve ter | NOVO | Passo 7, RN5 | Comparando as pistas de áudio, original e resultado têm o mesmo conteúdo. |
| REQ-VID-COMP-030 | O sistema deve manter a proporção do vídeo original no vídeo resultante. | NF (Fiabilidade) | Deve ter | NOVO | Passo 7, RN5 | A proporção do resultado é igual à do original. |
| REQ-VID-COMP-031 | O sistema deve guardar o vídeo resultante apenas se o seu tamanho for inferior ao do vídeo original. | NF (Capacidade) | Deve ter | NOVO | RN10, Pós-condição de sucesso | Dado um resultado menor, então é guardado; dado um resultado igual ou maior, então não é guardado. |
| REQ-VID-COMP-032 | O sistema deve guardar o vídeo resultante na biblioteca do utilizador como um novo vídeo. | F | Deve ter | ALT | Passo 8, RN6 | Concluída a operação, então a biblioteca contém um novo vídeo. |
| REQ-VID-COMP-033 | O sistema deve marcar a operação como *Concluída* após guardar o vídeo resultante. | F | Deve ter | ALT | Passo 8 | Guardado o resultado, então o estado é *Concluída*. |
| REQ-VID-COMP-034 | O sistema deve apresentar o tamanho do vídeo original e do vídeo resultante após a conclusão da operação. | F | Deveria ter | NOVO | Passo 8 | Dada uma operação concluída, então ambos os tamanhos são apresentados. |
| REQ-VID-COMP-035 | O sistema deve manter o vídeo original inalterado após a operação, qualquer que seja o seu resultado. | NF (Integridade) | Deve ter | NOVO | RN6, Exceção 6, Pós-condições | Em sucesso, falha ou cancelamento, o *checksum* do original mantém-se. |
| REQ-VID-COMP-036 | O sistema deve permitir ao utilizador reproduzir o vídeo resultante. | F | Deve ter | NOVO | Passo 9 | Dado o resultado, quando selecionado, então é reproduzido. |
| REQ-VID-COMP-037 | O sistema deve permitir ao utilizador descarregar o vídeo resultante. | F | Deve ter | ALT | Passo 9 | Dado o resultado, quando se pede o descarregamento, então o ficheiro é obtido. |
| REQ-VID-COMP-038 | O sistema deve permitir ao utilizador cancelar a operação enquanto esta estiver *Pendente* ou *Em processamento*. | F | Deveria ter | NOVO | FA2 | Dada uma operação nesses estados, então o cancelamento é possível. |
| REQ-VID-COMP-039 | O sistema deve interromper o processamento de uma operação cancelada. | F | Deveria ter | NOVO | FA2 | Cancelada a operação, então deixa de consumir processamento. |
| REQ-VID-COMP-040 | O sistema deve marcar como *Cancelada* a operação cancelada pelo utilizador. | F | Deveria ter | ALT | FA2, Pós-condição mínima | Cancelada a operação, então o estado é *Cancelada*. |
| REQ-VID-COMP-041 | O sistema deve descartar os dados parciais de uma operação cancelada ou falhada. | NF (Integridade) | Deve ter | NOVO | FA2, Exceção 5, Pós-condição mínima | Após cancelamento ou falha, não existem dados parciais armazenados. |
| REQ-VID-COMP-042 | O sistema não deve disponibilizar vídeo resultante numa operação cancelada ou falhada. | NF (Integridade) | Deve ter | NOVO | FA2, Exceção 5, Pós-condição mínima | Após cancelamento ou falha, a biblioteca não contém vídeo novo. |
| REQ-VID-COMP-043 | O sistema deve marcar como *Falhada* a operação cujo processamento falhe a meio. | F | Deve ter | ALT | Exceção 5, Pós-condição mínima | Dada uma falha induzida, então o estado é *Falhada*. |
| REQ-VID-COMP-044 | O sistema deve informar o utilizador quando uma operação falhar. | F | Deve ter | NOVO | Exceção 5, Pós-condição mínima | Dada uma falha, então o utilizador vê uma notificação ou mensagem. |
| REQ-VID-COMP-045 | O sistema deve marcar como *Falhada* a operação cujo vídeo resultante não possa ser guardado por falta de espaço de armazenamento. | F | Deve ter | NOVO | Exceção 6 | Dado armazenamento cheio, então a operação fica *Falhada*. |
| REQ-VID-COMP-046 | O sistema deve informar o utilizador de que a falha se deve à falta de espaço de armazenamento. | F | Deve ter | NOVO | Exceção 6 | Dada essa falha, então a mensagem indica o motivo. |
| REQ-VID-COMP-047 | O sistema deve marcar como *Falhada* a operação cujo vídeo resultante não seja mais pequeno do que o original, informando o utilizador de que a compressão não reduziu o tamanho. | F | Deve ter | NOVO | Exceção 7, RN10 | Dado um resultado com tamanho ≥ ao original, então a operação fica *Falhada* e a mensagem é apresentada. |
| REQ-VID-COMP-048 | O sistema não deve contabilizar na quota diária as operações falhadas ou canceladas. | F | Deve ter | ALT | Exceção 5, Exceção 7, RN9 | Dada uma operação falhada, então o contador do dia não aumenta. |
| REQ-VID-COMP-049 | O sistema deve contabilizar na quota diária cada operação concluída com sucesso por um utilizador Registado. | F | Deve ter | ALT | RN7, Pós-condição de sucesso | Dado um Registado, quando uma operação conclui, então o contador aumenta em 1. |
| REQ-VID-COMP-050 | O sistema não deve aplicar o limite diário de operações ao utilizador Premium. | F | Deve ter | ALT | RN8 | Dado um Premium com mais de 5 operações no dia, então a seguinte é aceite. |
| REQ-VID-COMP-051 | O sistema não deve permitir alterar uma operação após a sua confirmação. | F | Poderia ter | NOVO | A6 | Dada uma operação confirmada, então as opções não são editáveis. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| Perfil Anónimo | Manter | O perfil anónimo continua sem acesso a operações de vídeo | REQ-VID-COMP-002 |
| Perfis Registado e Premium | Estender | Passam a ter acesso à operação de compressão; o Premium continua sem limite diário | REQ-VID-COMP-001, REQ-VID-COMP-050 |
| Quota diária de operações (5/dia, perfil Registado) | Alterar | Um vídeo conta como 1 operação, apenas quando concluída com sucesso; operações falhadas ou canceladas não contam | REQ-VID-COMP-017, REQ-VID-COMP-018, REQ-VID-COMP-048, REQ-VID-COMP-049 |
| Limites de processamento por perfil | Estender | Passam a existir limites de duração e tamanho para vídeo | REQ-VID-COMP-021 |
| Fila de processamento | Estender | Passa a aceitar operações de vídeo, que são mais exigentes em recursos | REQ-VID-COMP-023 |
| Estados das operações e progresso | Estender | Os estados e o progresso passam a aplicar-se a operações de vídeo, incluindo cancelamento | REQ-VID-COMP-024, REQ-VID-COMP-033, REQ-VID-COMP-040, REQ-VID-COMP-043 |
| Biblioteca do utilizador | Estender | Passa a guardar o vídeo resultante como novo item, sem substituir o original | REQ-VID-COMP-032 |
| Armazenamento | Estender | Passa a tratar a falta de espaço ao guardar vídeos resultantes e a só guardar resultados menores que o original | REQ-VID-COMP-031, REQ-VID-COMP-045, REQ-VID-COMP-046 |
| Exportação / descarregamento | Estender | Passa a permitir descarregar vídeos | REQ-VID-COMP-037 |
| Encadeamento de ferramentas | Manter | Fora do âmbito deste caso de uso (ver Q8) | — |
| Processamento em lote | Manter | Fora do âmbito deste caso de uso | — |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| Pré-condições | Sessão, vídeo na biblioteca e pronto | REQ-VID-COMP-003, REQ-VID-COMP-022 |
| Trigger | Selecionar vídeo e escolher a operação | REQ-VID-COMP-001 |
| Passo 1 | Selecionar vídeo; ver detalhes | REQ-VID-COMP-001, REQ-VID-COMP-004 |
| Passo 2 | Escolher operação; formulário | REQ-VID-COMP-001, REQ-VID-COMP-005 |
| Passo 3 | Escolher opções; validar; estimativa | REQ-VID-COMP-006, REQ-VID-COMP-007, REQ-VID-COMP-008, REQ-VID-COMP-012, REQ-VID-COMP-014 |
| Passo 4 | Confirmar; quota; criar operação | REQ-VID-COMP-015, REQ-VID-COMP-016, REQ-VID-COMP-017 |
| Passo 5 | Colocar na fila; estado Pendente | REQ-VID-COMP-023 |
| Passo 6 | Consultar estado e progresso | REQ-VID-COMP-024, REQ-VID-COMP-025 |
| Passo 7 | Processar e reduzir o tamanho | REQ-VID-COMP-026, REQ-VID-COMP-027, REQ-VID-COMP-029 |
| Passo 8 | Guardar resultado; marcar Concluída; tamanhos | REQ-VID-COMP-032, REQ-VID-COMP-033, REQ-VID-COMP-034 |
| Passo 9 | Reproduzir e descarregar resultado | REQ-VID-COMP-036, REQ-VID-COMP-037 |
| FA1 | Resolução de saída inválida | REQ-VID-COMP-008, REQ-VID-COMP-009 |
| FA2 | Cancelamento do processamento | REQ-VID-COMP-038, REQ-VID-COMP-039, REQ-VID-COMP-040, REQ-VID-COMP-041, REQ-VID-COMP-042 |
| FA3 | Alterar opções antes de confirmar | REQ-VID-COMP-011, REQ-VID-COMP-013 |
| FA4 | Opções por omissão | REQ-VID-COMP-010 |
| Exceção 1 | Formato ou codec não suportado | REQ-VID-COMP-020 |
| Exceção 2 | Vídeo ainda em carregamento ou processamento | REQ-VID-COMP-022 |
| Exceção 3 | Limite diário atingido | REQ-VID-COMP-018, REQ-VID-COMP-019 |
| Exceção 4 | Duração ou tamanho excedidos | REQ-VID-COMP-021 |
| Exceção 5 | Falha a meio do processamento | REQ-VID-COMP-041, REQ-VID-COMP-042, REQ-VID-COMP-043, REQ-VID-COMP-044, REQ-VID-COMP-048 |
| Exceção 6 | Falta de espaço de armazenamento | REQ-VID-COMP-035, REQ-VID-COMP-045, REQ-VID-COMP-046 |
| Exceção 7 | Resultado não é mais pequeno que o original | REQ-VID-COMP-047, REQ-VID-COMP-048 |
| Pós-condição de sucesso | Novo vídeo menor, original intacto, quota | REQ-VID-COMP-028, REQ-VID-COMP-030, REQ-VID-COMP-031, REQ-VID-COMP-032, REQ-VID-COMP-033, REQ-VID-COMP-035, REQ-VID-COMP-049 |
| Pós-condição mínima | Original intacto; sem vídeo parcial | REQ-VID-COMP-035, REQ-VID-COMP-040, REQ-VID-COMP-041, REQ-VID-COMP-042, REQ-VID-COMP-043, REQ-VID-COMP-044 |
| RN1 | Só Registado e Premium | REQ-VID-COMP-001, REQ-VID-COMP-002 |
| RN2 | Três níveis de compressão | REQ-VID-COMP-006 |
| RN3 | Resolução de saída nunca superior à original | REQ-VID-COMP-007, REQ-VID-COMP-008, REQ-VID-COMP-027 |
| RN4 | Opções por omissão | REQ-VID-COMP-010 |
| RN5 | Duração, áudio e proporção mantidos | REQ-VID-COMP-028, REQ-VID-COMP-029, REQ-VID-COMP-030 |
| RN6 | Original inalterado; resultado novo | REQ-VID-COMP-032, REQ-VID-COMP-035 |
| RN7 | Concluída conta para 5/dia (Registado) | REQ-VID-COMP-018, REQ-VID-COMP-049 |
| RN8 | Premium sem limite diário | REQ-VID-COMP-050 |
| RN9 | Falhada ou cancelada não conta | REQ-VID-COMP-048 |
| RN10 | Só guarda se for menor que o original | REQ-VID-COMP-031, REQ-VID-COMP-047 |
| A2 | Tamanho, duração e resolução conhecidos | REQ-VID-COMP-004 |
| A3 | Fila e estados reutilizáveis | REQ-VID-COMP-023 |
| A4 | Estimativa síncrona < 1 s | REQ-VID-COMP-014 |
| A6 | Operação confirmada não é editável | REQ-VID-COMP-051 |
