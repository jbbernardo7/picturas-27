# 📝 Exercício 2 — Template para Atualização da Secção 4
### Especificação de Requisitos do Sistema · Fase 1: Suporte a Vídeo no PictuRAS

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | Grupo 6 - PL5 |
| **Autores** | Vicente Silva pg64042; nome (nº); … |
| **Data** | 2026-10-19 |
| **Versão do documento** | v1.1 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Recorte temporal de vídeo  |
| **Perfil(s) de utilizador abrangido(s)** | Registado e Premium. O recorte não é uma ferramenta avançada de IA, pelo que não depende do perfil Premium. |

**Justificação no contexto do MVP** *(2–3 linhas)*

O recorte temporal é uma operação fundamental de edição de vídeo e valida o ciclo completo que o suporte a vídeo ainda não tem: o armazenamento já aceita vídeos. Esta funcionalidade permite validar a extensão do processamento assíncrono e do armazenamento de resultados a vídeo, sem alterar o vídeo original.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-002 |
| **Nome** | Recortar intervalo temporal de vídeo (trim)|
| **Versão** | v1.1 |
| **Autor** | Vicente Silva |
| **Data** | 2026-10-19 |
| **Objetivo** | Permitir ao utilizador, num projeto de vídeo, definir um intervalo temporal e obter um novo vídeo contendo apenas esse intervalo |
| **Âmbito** | Módulo de processamento de vídeo do PictuRAS |
| **Ator Principal** | Utilizador Registado ou Premium |
| **Stakeholders e Interesses** | - **Utilizador**: pretende remover partes desnecessárias de um vídeo e obter uma versão mais curta<br>- **Proprietário do Sistema**: pretende disponibilizar uma funcionalidade de edição de vídeo integrada <br>- **Equipa de Desenvolvimento**: valida o processamento de vídeo e a integração com os mecanismos existentes de armazenamento e processamento |
| **Pré-condições** | -O utilizador tem sessão iniciada<br>- O projeto é do tipo vídeo e contém um vídeo cujo upload foi concluído<br> |
| **Trigger** | O utilizador abre um projeto de vídeo e escolhe a ferramenta Recortar vídeo na barra de ferramentas |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre um projeto de vídeo | O sistema apresenta o leitor com o vídeo e apenas as ferramentas de vídeo |
| 2 | O utilizador seleciona a ferramenta **Recortar vídeo** | O sistema apresenta os campos do instante inicial e final (em segundos), a duração do vídeo e um leitor para pré-visualizar o intervalo |
| 3 | O utilizador introduz o instante inicial e o instante final do intervalo pretendido | O sistema valida os valores introduzidos e verifica se o intervalo é válido |
| 4 | O utilizador confirma o recorte | O sistema adiciona a ferramenta de recorte, com os respetivos parâmetros, à lista de ferramentas do projeto |
| 5 | - | O sistema inicia o processamento da operação e apresenta o estado da operação ao utilizador. |
| 6 | O utilizador pode consultar o estado da operação| O sistema apresenta o estado atual e, quando disponível, o progresso do processamento. |
| 7 | - | O serviço de recorte lê o vídeo original, extrai o intervalo definido e gera um novo ficheiro de vídeo. |
| 8 | - | O sistema guarda o vídeo resultante nos resultados do projeto, mantém o original inalterado  |
| 9 | O utilizador abre os resultados do projeto | O sistema permite pré-visualizar e descarregar o vídeo recortado |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Intervalo de tempo inválido | Se o instante inicial for maior ou igual ao instante final, ou se algum dos instantes estiver fora da duração do vídeo, o sistema rejeita o intervalo e solicita ao utilizador que introduza valores válidos |
| FA2 – Cancelamento do processo | Se o utilizador cancelar a operação enquanto esta estiver pendente, o sistema cancela o processamento e não disponibiliza um novo vídeo resultante. |
| FA3 – Nova execução com resultado anterior | Se o projeto já tiver um resultado de uma execução anterior, ao aplicar de novo o sistema remove esse resultado e gera o novo, de modo que o projeto tem sempre um único resultado atual. |


### 2.4 Exceções


| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| O codec interno do vídeo não é suportado pelo serviço de recorte | O sistema marca a operação como falhada e informa o utilizador de que o codec não é suportado |
| O processamento falha durante a execução | O sistema marca a operação como falhada, informa o utilizador e não disponibiliza um vídeo resultante incompleto |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | O vídeo recortado fica disponível nos resultados do projeto, contendo exclusivamente o intervalo selecionado; o vídeo original permanece no projeto, inalterado |
| Garantia Mínima | Em caso de falha ou cancelamento, o vídeo original permanece disponível e inalterado, a operação fica registada com o respetivo estado e o utilizador é informado do resultado da operação |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | O instante inicial do recorte deve ser inferior ao instante final |
| RN2 | O intervalo selecionado deve estar contido na duração do vídeo original |
| RN3 | O vídeo original não é alterado nem substituído pelo resultado do recorte |
| RN4 | O recorte só pode ser aplicado em projetos do tipo vídeo, e só pode conter ferramentas de vídeo |



### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O vídeo já foi carregado e o projeto de vídeo está disponível | 
| A2 | O sistema consegue determinar a duração do vídeo antes de iniciar o recorte | 
| A3 | O sistema possui armazenamento suficiente para guardar o vídeo resultante sem alterar o vídeo original | 
| A4 | O recorte temporal corresponde a um único intervalo contínuo definido pelo instante inicial e pelo instante final | 

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | Quais os formatos e codecs de vídeo suportados pelo MVP? | 
| Q2 | O perfil anónimo deve ter acesso à funcionalidade de recorte temporal? | 

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| ChatGPT | Apoio na estruturação e revisão do caso de uso | Revisão manual do conteúdo pela equipa, verificando o alinhamento com o enunciado, o template e as regras do PictuRAS |

---

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** {UC-VID-002 — Recorte temporal (trim)}  
**Versão do dossiê:** v1.2 
**Baseline do Exercício 1:** v1.1 — REQ-VID-TRIM-001 a REQ-VID-TRIM-017


### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

Inclua os requisitos funcionais derivados no Exercício 1 e os acrescentados para completar o serviço **dentro do âmbito escolhido**. Mantenha o ID original quando a intenção não mudou. Identifique a evolução face ao Exercício 1.

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
|--------|---------------|----------------|--------------|--------------|--------------------------------|-----------------|----------------------------------------|
| REQ-VID-TRIM-001 | O sistema deve permitir ao utilizador Registado ou Premium selecionar um vídeo disponível no seu projeto e iniciar a operação de recorte temporal. | Deve | Mantido | ALT | UC-VID-002, trigger; passo 1 | Disponibiliza a funcionalidade aos perfis autorizados. | Dado um utilizador autorizado com um vídeo disponível, quando selecionar Recortar vídeo, então o sistema deve apresentar a configuração do recorte. |
| REQ-VID-TRIM-002 | O sistema deve apresentar campos para definir o instante inicial e final do recorte e a duração do vídeo. | Deve | Mantido | NOVO | UC-VID-002, passo 2 | Permite configurar o intervalo. | Dado um vídeo selecionado, quando abrir a ferramenta, então os campos e a duração devem ser apresentados. |
| REQ-VID-TRIM-003 | O sistema deve validar que o instante inicial é inferior ao instante final. | Deve | Mantido | NOVO | UC-VID-002, passo 3; RN1 | Impede intervalos sem duração válida. | Dado um intervalo com início maior ou igual ao fim, quando tentar guardá-lo, então o sistema deve rejeitá-lo. |
| REQ-VID-TRIM-004 | O sistema deve validar que os instantes inicial e final pertencem à duração do vídeo original. | Deve | Mantido | NOVO | UC-VID-002, FA1; RN2 | Impede recortes fora dos limites do vídeo. | Dado um instante negativo ou superior à duração do vídeo, quando submeter o intervalo, então o sistema deve rejeitá-lo. |
| REQ-VID-TRIM-005 | O sistema deve informar o utilizador quando o intervalo temporal for inválido e solicitar valores válidos. | Deve | Mantido | NOVO | UC-VID-002, FA1 | Torna a validação compreensível. | Dado um intervalo inválido, quando o utilizador o submeter, então deve receber uma indicação do erro e poder corrigir os valores |
| REQ-VID-TRIM-006 | O sistema deve criar e registar uma operação de recorte com os instantes inicial e final confirmados pelo utilizador. | Deve | Mantido | Novo | UC-VID-002, passo4 | Permite identificar a operação e os parâmetros utilizados. | Dado um intervalo válido, quando o utilizador confirmar o recorte, então é criada uma operação associada ao projeto e com os parâmetros selecionados.|
| REQ-VID-TRIM-007 | O sistema deve iniciar o processamento assíncrono de uma operação de recorte confirmada. | Deve | Mantido | ALT | UC-VID-002, passo 5; A5 | Reutiliza o mecanismo de processamento existente. | Dada uma operação confirmada e aceite para processamento, quando for iniciada a execução, então o sistema regista o seu estado de processamento. |
| REQ-VID-TRIM-008 | O sistema deve apresentar o estado atual da operação de recorte ao utilizador. | Deve | Mantido | ALT | UC-VID-002, passo 6 | Permite acompanhar o resultado da execução. | Dada uma operação registada, quando o utilizador consultar o seu estado, então o sistema apresenta o estado atual registado. |
| REQ-VID-TRIM-009 | O sistema deve apresentar o progresso do processamento quando o serviço disponibilizar informação de progresso. | Deve | Mantido | ALT | UC-VID-002, passo 6| Reutiliza o mecanismo de progresso sem apresentar valores inventados. | Dada uma operação em processamento, quando o serviço disponibilizar progresso, então o sistema apresenta o valor correspondente. |
| REQ-VID-TRIM-010 | O sistema deve gerar um vídeo resultante correspondente ao intervalo temporal selecionado, respeitando os limites definidos. | Deve | Mantido | NOVO | UC-VID-002, passo 7; RN1; RN2 | Assegura a correção funcional do recorte. | Dado um vídeo e um intervalo válido, quando o processamento terminar com sucesso, então o vídeo resultante contém o intervalo selecionado e não inclui conteúdo temporal exterior a esse intervalo. |
| REQ-VID-TRIM-011 | O sistema deve guardar o vídeo resultante nos resultados do projeto após a conclusão bem-sucedida do processamento. | Deve | Mantido | ALT | UC-VID-002, passo 8 | Integra o resultado no armazenamento existente. | Dada uma operação concluída com sucesso, quando o utilizador consultar os resultados do projeto, então o vídeo resultante está disponível e associado à operação. |
| REQ-VID-TRIM-012 | O sistema deve permitir ao utilizador consultar, pré-visualizar e descarregar o vídeo recortado disponível nos resultados do projeto. | Deve | Mantido | ALT | UC-VID-002, passo 9 | Permite utilizar o resultado produzido. | Dado um resultado disponível e um utilizador autorizado, quando abrir os resultados, então pode pré-visualizar e descarregar o vídeo recortado. |
| REQ-VID-TRIM-013 | O sistema deve rejeitar o processamento de vídeos cujo formato ou codec não seja suportado pelo serviço de recorte. | Deve | Mantido | NOVO | UC-VID-002, exceção; Q1 | Evita iniciar operações incompatíveis com o serviço. | Dado um vídeo com formato ou codec não suportado, quando for submetido para recorte, então o sistema informa o utilizador e não disponibiliza um resultado inválido. |
| REQ-VID-TRIM-014 | O sistema deve marcar uma operação como falhada quando ocorrer uma falha durante o processamento. | Deve | Mantido | ALT | UC-VID-002, exceção | Mantém um estado coerente da operação. | Dada uma operação em processamento, quando ocorrer uma falha irrecuperável, então o seu estado passa a «Falhada». |
| REQ-VID-TRIM-015 | O sistema deve informar o utilizador quando uma operação de recorte falhar. | Deve | Mantido | ALT | UC-VID-002, exceção | Permite compreender que a operação não foi concluída. | Dada uma operação falhada, quando o utilizador consultar o estado, então recebe uma indicação da falha e, quando disponível, a respetiva causa. |
| REQ-VID-TRIM-016 | O sistema não deve disponibilizar como resultado um ficheiro de vídeo incompleto produzido por uma operação falhada. | Deve | Mantido | NOVO | UC-VID-002, exceção; | Evita apresentar ficheiros inválidos como resultados concluídos. | Dada uma operação que falhe durante a geração do vídeo, quando o utilizador consultar os resultados, então o ficheiro incompleto não é apresentado como resultado válido. |
| REQ-VID-TRIM-017 | O sistema deve manter o vídeo original disponível e inalterado após o recorte, independentemente do sucesso ou falha da operação. | Deve | Refinado | ALT | UC-VID-002, RN3 e pós-condições | Protege o conteúdo de origem. | Dado um vídeo original, quando uma operação de recorte terminar com sucesso, falhar ou for cancelada, então o original permanece disponível e mantém o seu conteúdo. |
| REQ-VID-TRIM-018 | Quando uma nova execução de recorte for concluída com sucesso, o sistema deve substituir o resultado atual do projeto pelo novo resultado, preservando o vídeo original. | Deve | Refinado | ALT | UC-VID-002, FA3; RN3 | Mantém um único resultado atual sem destruir a fonte original. | Dado um projeto com um resultado anterior, quando uma nova execução terminar com sucesso, então o novo resultado passa a ser o resultado atual e o original permanece inalterado. Se a nova execução falhar, o resultado anterior não deve ser eliminado antes de existir um novo resultado válido. |
| REQ-VID-TRIM-019 | O sistema deve permitir a utilização da ferramenta de recorte apenas em projetos do tipo vídeo e não deve permitir a inclusão de ferramentas incompatíveis com esse tipo de projeto. | Deve | Mantido | ALT | UC-VID-002, pré-condições; RN4 | Restringe a ferramenta ao contexto funcional previsto. | Dado um projeto que não seja do tipo vídeo, quando o utilizador consultar as ferramentas disponíveis, então a ferramenta de recorte de vídeo não pode ser aplicada. |




#### 4.1.2 Requisitos Não Funcionais e de Qualidade

Classifique requisitos de qualidade segundo a ISO/IEC 25010. Registe regras de negócio e restrições funcionais na tabela 4.1.1; não as classifique como qualidade sem justificação. Para cada requisito de qualidade, distinga o que o MVP deve cumprir do alvo de produção.

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
|--------|---------------|----------------------------------|--------------|------------------|--------------|----------------------|----------------------------------------|
| REQ-VID-TRIM-Q001 | O sistema deve aceitar e registar uma operação de recorte válida em até 2 segundos, em pelo menos 95% de 100 pedidos de teste, excluindo o tempo de execução do recorte. | Eficiência de desempenho — comportamento temporal | P95 ≤ 2 s, numa carga de teste documentada | P95 ≤ 1 s, sob a carga de produção acordada | Novo | DQ-001 | Submeter 100 pedidos válidos em ambiente controlado e medir o tempo entre a confirmação e o registo da operação. |
| REQ-VID-TRIM-Q002 | O sistema deve manter os estados das operações coerentes com o resultado efetivo do processamento e não apresentar ficheiros incompletos como resultados válidos. | Fiabilidade | Em todos os testes de aceitação, nenhuma falha simulada deve produzir um resultado marcado como concluído | Igual ao MVP, com monitorização e recuperação operacional | Novo | DQ-002; UC-VID-002, exceção | Simular falhas antes e durante a geração do ficheiro e verificar o estado da operação e os resultados apresentados. |
| REQ-VID-TRIM-Q003 | O sistema deve impedir o acesso aos resultados de recorte por utilizadores não autorizados ao projeto. | Segurança — confidencialidade e controlo de acesso | 100% dos testes de acesso não autorizado devem ser rejeitados | Igual ao MVP, complementado por monitorização e auditoria adequadas | Novo | DQ-003; UC-VID-002, pré-condições | Tentar consultar e descarregar resultados com uma conta sem autorização para o projeto; todos os pedidos devem ser recusados. |
| REQ-VID-TRIM-Q004 | O sistema deve conservar o vídeo original sem alterações provocadas pelo processamento de recorte. | Fiabilidade | 100% dos testes devem confirmar a preservação do original | Igual ao MVP, com verificações de integridade adequadas ao ambiente de produção | Refinado | DQ-002; RN3 | Comparar a integridade do ficheiro original antes e depois de operações bem-sucedidas, falhadas e canceladas. |



#### 4.1.3 Verificação da completude e dos limites do âmbito

Avalie os tópicos do enunciado relativamente à funcionalidade escolhida. “Não aplicável” ou “fora do âmbito” é aceitável quando justificado; isso não obriga a introduzir funcionalidades alheias ao caso de uso.

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
|-----------------------|---------------|----------------------------|--------------------------------|
| Formato, codec, duração e dimensão do vídeo | Sim | É necessário definir os formatos e codecs aceites, bem como limites máximos de duração e dimensão. A lista concreta de formatos e os limites ficam pendentes de decisão da equipa. | REQ-VID-TRIM-004, REQ-VID-TRIM-013; Q1, Q3 |
| Estado, progresso, cancelamento e resultado | Sim | O utilizador deve conseguir consultar o estado, acompanhar o progresso quando disponível, cancelar uma operação pendente e aceder ao resultado válido. | REQ-VID-TRIM-008, 009, 011, 012, 018 |
| Falhas durante o processamento | Sim | Devem ser registadas as falhas, informado o utilizador e impedida a publicação de resultados incompletos. | REQ-VID-TRIM-014, 015, 016, 017; REQ-VID-TRIM-Q002 |
| Persistência e expiração dos ficheiros | Sim | O resultado tem de permanecer disponível para consulta e descarga após o processamento. O período de retenção e as regras de expiração ainda precisam de ser definidos. | REQ-VID-TRIM-011, 012, 017; Q4 |
| Perfis e contagem de operações | Sim | A funcionalidade destina-se aos perfis Registado e Premium. A quota diária e a contagem das operações não estão definidas no caso de uso e não devem ser assumidas como implementadas. | REQ-VID-TRIM-001; Q2, Q4 |
| Encadeamento de ferramentas e processamento em lote | Sim | O caso de uso cobre apenas um intervalo contínuo de um vídeo numa operação. Encadear várias ferramentas e processar vários vídeos em lote ficam fora do âmbito desta fase, salvo decisão explícita posterior. | REQ-VID-TRIM-006, 007, 010, 020 |

**Evolução:** *Mantido* = requisito preservado; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

### 4.2 Impacto no sistema existente

Atualize a análise do Exercício 1 se algum requisito novo ou refinado a alterar. Inclua requisitos NOVO que interajam com mecanismos existentes.

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
|--------------------------------|-------------------------------------------|--------------------------|--------------------------------|
| Lista de ferramentas de vídeo | Estender | Passa a incluir a ferramenta de recorte | REQ-VID-TRIM-001|
| Estado das operações de processamento | Estender | O mecanismo existente de apresentação do estado das operações deve também suportar operações de recorte de vídeo. | REQ-VID-TRIM-008, REQ-VID-TRIM-017 |
| Barra/mecanismo de progresso | Estender | O mecanismo existente utilizado para apresentar o progresso do processamento de imagens deve ser reutilizado para o processamento de vídeos. | REQ-VID-TRIM-009 |
| Registo das operações | Estender | O mecanismo existente de registo das operações de processamento deve suportar operações de recorte de vídeo. | REQ-VID-TRIM-006, REQ-VID-TRIM-008 |
|Armazenamento| Estender|Guardar o resultado do recorte sem alterar o vídeo original e impedir a publicação de ficheiros incompletos.|	REQ-VID-TRIM-011, 016, 017; Q002, Q004|
|Gestão dos resultados|	Estender|Permitir a pré-visualização e descarga do vídeo resultante e gerir a substituição do resultado atual.|REQ-VID-TRIM-012, 019|
Cancelamento das operações|	Estender|Permitir cancelar operações pendentes, de acordo com os estados suportados pelo mecanismo existente.|REQ-VID-TRIM-018|
Segurança dos ficheiros|Estender|Aplicar os mecanismos de autorização existentes à consulta e descarga dos vídeos resultantes.|	REQ-VID-TRIM-Q003|
Monitorização e testes|	Estender|Verificar os tempos de resposta, a coerência dos estados, as falhas e a integridade dos ficheiros.|REQ-VID-TRIM-Q001 a Q004


### 4.3 Matriz de Rastreabilidade Atualizada

Estenda a matriz do Exercício 1. Um requisito funcional deve apontar para um elemento do caso de uso ou regra de negócio. Um requisito de qualidade pode apontar para uma decisão de qualidade `DQ-nnn`, registada na secção 2.7 como assunção/decisão, ou na lista de decisões abaixo. Decisões com impacto funcional devem também ser refletidas no caso de uso ou justificadas como extensão do âmbito.

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
|------------------------|-------------------------|--------------------------------|
| Pré-condições| Utilizador autenticado e vídeo disponível |REQ-VID-TRIM-001|
| Trigger; Passo 1| Abrir projeto de vídeo e escolher «Recortar vídeo» | REQ-VID-TRIM-001 |
| Passo 2 | Definir início e fim | REQ-VID-TRIM-002 |
| Passo 3 | Validar intervalo | REQ-VID-TRIM-003, REQ-VID-TRIM-004, REQ-VID-TRIM-005 |
| Passo 4 | Criar operação | REQ-VID-TRIM-006 |
| Passo 5 | Iniciar processamento | REQ-VID-TRIM-007  |
| Passo 6 | Apresentar estado/progresso| REQ-VID-TRIM-008, REQ-VID-TRIM-009 |
| Passo 7 | Executar recorte temporal | REQ-VID-TRIM-010 |
| Passo 8 | Disponibilizar vídeo resultante | REQ-VID-TRIM-011 |
| Passo 9 | Consultar/descarregar resultado | REQ-VID-TRIM-012 |
| FA1 | Intervalo inválido | REQ-VID-TRIM-003, REQ-VID-TRIM-004, REQ-VID-TRIM-005 |
| Exceção | Codec/formato não suportado | REQ-VID-TRIM-013  |
| Exceção | Limite diário atingido | REQ-VID-TRIM-014, REQ-VID-TRIM-015, REQ-VID-TRIM-016 |
| Exceção | Falha no processamento | REQ-VID-TRIM-017 |
| Pós-condição | Vídeo resultante disponível;original preservado | REQ-VID-TRIM-011 |
| RN1 | Início < fim | REQ-VID-TRIM-003, REQ-VID-TRIM-010 |
| RN2 | Intervalo dentro da duração| REQ-VID-TRIM-004, REQ-VID-TRIM-010 |
| RN3/RN4 | Quota de Registado | REQ-VID-TRIM-014, REQ-VID-TRIM-015 |
| A5 | Reutilização do processamento existente | REQ-VID-TRIM-007, REQ-VID-TRIM-008, REQ-VID-TRIM-009 |
|DQ-001 |Tempo de resposta da submissão da operação	|REQ-VID-TRIM-Q001|
|DQ-002 |Integridade dos resultados e coerência dos estados	|REQ-VID-TRIM-Q002|
|DQ-003 |Proteção dos resultados contra acessos não autorizados |REQ-VID-TRIM-Q003|
|DQ-004 |Integridade do vídeo original |REQ-VID-TRIM-Q004|

**Decisões de qualidade introduzidas nesta aula**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
|--------|--------------------------|-----------------|--------------------------------|
|DQ-001|Separar o tempo de resposta da submissão da operação do tempo total de processamento do vídeo.| O processamento é assíncrono e a duração depende do vídeo e dos recursos disponíveis.|REQ-VID-TRIM-007, 009; Q001
|DQ-002|Uma operação só pode disponibilizar um resultado quando o ficheiro estiver completo e válido.|Evita apresentar resultados parciais como operações concluídas com sucesso.|REQ-VID-TRIM-011, 014, 016, 019; Q002|
|DQ-003|Aplicar controlo de acesso aos vídeos originais e aos resultados do recorte.|Os ficheiros do projeto não devem ficar acessíveis a utilizadores sem autorização.|REQ-VID-TRIM-001, 012; Q003|
DQ-004|Preservar o vídeo original durante todo o ciclo de vida da operação de recorte.|Permite recuperar do resultado de uma operação falhada ou cancelada sem perder a fonte.|REQ-VID-TRIM-017; Q004|

**Verificações de cobertura**
- [ ] Cada requisito funcional e não funcional aparece na matriz.
- [ ] Cada requisito tem origem identificada: elemento do caso de uso, regra de negócio ou decisão de qualidade.
- [ ] Todos os elementos relevantes do caso de uso têm requisito associado ou justificação para não terem.
- [ ] Os tópicos excluídos na secção 4.1.3 estão justificados.
- [ ] O impacto no sistema existente está atualizado e ligado aos requisitos relevantes.

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
