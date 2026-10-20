# 📝 Exercício 1 — Template de Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | Grupo 6 - PL5 |
| **Autores** | Vicente Silva pg64042 |
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

> ⛔ **Não preencher no Exercício 1.** Esta secção será trabalhada na aula seguinte, a partir do caso de uso das secções 2.1 a 2.8. Fica aqui para que conheçam o passo seguinte — veja a secção com o mesmo nome no exemplo de vídeo.

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| REQ-VID-TRIM-001 | O sistema deve permitir ao utilizador Registado ou Premium, abrir um projeto de vídeo e iniciar a ferramenta de recorte. | F | Deve ter | Novo |Trigger ; Pré-Condições; Passo 1| Dado um utilizador com permissão de edição num projeto de vídeo, quando escolher «Recortar vídeo», então a configuração do recorte é iniciada. |
| REQ-VID-TRIM-002 | O sistema deve apresentar campos de instante inicial e final, a duração do vídeo e um leitor para pré-visualização. | F | Deve ter | Novo | Passo 2 | Dado um vídeo selecionado, quando escolher «Recortar vídeo», então os campos, a duração e o leitor são apresentados.|
| REQ-VID-TRIM-003 | O sistema deve validar se o instante inicial é inferior ao instante final. | F | Deve ter | Novo | Passo 3; RN1 | Dado um intervalo com instante inicial maior ou igual ao instante final, quando o utilizador o submeter, então o sistema deve rejeitá-lo.|
| REQ-VID-TRIM-004 | O sistema deve validar se o instante inicial e o instante final estão contidos na duração do vídeo original. | F | Deve ter | Novo | Passo 3;FA1;RN2;A2 | Dado um intervalo com pelo menos um instante fora da duração do vídeo, quando o utilizador o submeter, então o sistema deve rejeitá-lo.|
| REQ-VID-TRIM-005 | O sistema deve rejeitar um intervalo temporal inválido e solicitar ao utilizador a introdução de valores válidos. | F | Deve ter | Novo | FA1 | Dado um intervalo inválido, quando o utilizador o submeter, então o sistema deve rejeitar o intervalo e solicitar novos valores. |
| REQ-VID-TRIM-006 | O sistema deve criar uma nova operação de processamento e registá-la para o vídeo selecionado após a confirmação de um intervalo válido. | F | Deve ter | Novo | Passo 4 | Dado um intervalo válido, quando o utilizador confirmar o recorte, então deve ser criada e registada uma nova operação para o vídeo selecionado. |
| REQ-VID-TRIM-007 | O sistema deve iniciar o processamento da operação de recorte | F | Deve ter | ALT | Passo 5 | Dado que uma operação de recorte foi criada, o sistema deve iniciar o processamento |
| REQ-VID-TRIM-008 | O sistema deve apresentar o estado atual da operação de recorte ao utilizador. | F | Deve ter | ALT | Paso 5;Passo 6 | Dado que a operação está em processamento, o sistema deve apresentar o seu estado. |
| REQ-VID-TRIM-009 | O sistema deve apresentar a barra de progresso durante o processamento do vídeo | F | Deve ter | ALT | Passo 6 | Dado que o vídeo está a ser processado, a barra de progresso deve apresentar o progresso da operação. |
| REQ-VID-TRIM-010 | O sistema deve processar o vídeo de acordo com o instante inicial e o instante final especificados pelo utilizador. | F | Deve ter | Novo | Passo 7;RN1;RN2 | Dado um intervalo válido, o vídeo resultante deve corresponder ao intervalo selecionado.|
| REQ-VID-TRIM-011 | O sistema deve guardar o vídeo resultante nos resultados do projeto após sucesso. | F | Deve ter | ALT | Passo 8| Após sucesso, o resultado está disponível nos resultados do projeto. |
| REQ-VID-TRIM-012 | O sistema deve permitir ao utilizador consultar e descarregar o vídeo recortado. | F | Deve ter | ALT | Passo 9| Dado que o vídeo está disponível, o utilizador deve poder consultá-lo e descarregá-lo. |
| REQ-VID-TRIM-013 | O sistema deve rejeitar a operação quando o formato ou codec do vídeo não for suportado | F | Deve ter | Novo | Exceção | Dado um formato ou codec não suportado, a operação deve ser rejeitada. |
| REQ-VID-TRIM-014 | O sistema deve marcar a operação como falhada quando ocorrer uma falha durante o processamento. | F | Dve ter | ALT | Exceção | Quando ocorrer uma falha, o estado da operação deve passar a falhada.|
| REQ-VID-TRIM-015 | O sistema deve informar o utilizador quando o processamento da operação falhar. | F |Deve ter | ALT | Exceção | Após uma falha, o utilizador deve ser informado. |
| REQ-VID-TRIM-016 | O sistema não deve disponibilizar um vídeo resultante incompleto quando o processamento falhar. | F | Deve ter| Novo | Exceção | Após uma falha, não deve existir um vídeo incompleto disponível como resultado.|
| REQ-VID-TRIM-017 | O sistema deve manter o vídeo original disponível e inalterado após uma operação de recorte concluída com sucesso. | F | Deve ter | ALT | RN6 | Após o recorte, o vídeo original deve continuar disponível e inalterado.|


### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| Lista de ferramentas de vídeo | Estender | Passa a incluir a ferramenta de recorte | REQ-VID-TRIM-001|
| Estado das operações de processamento | Estender | O mecanismo existente de apresentação do estado das operações deve também suportar operações de recorte de vídeo. | REQ-VID-TRIM-008, REQ-VID-TRIM-017 |
| Barra/mecanismo de progresso | Estender | O mecanismo existente utilizado para apresentar o progresso do processamento de imagens deve ser reutilizado para o processamento de vídeos. | REQ-VID-TRIM-009 |
| Registo das operações | Estender | O mecanismo existente de registo das operações de processamento deve suportar operações de recorte de vídeo. | REQ-VID-TRIM-006, REQ-VID-TRIM-008 |
| Armazenamento | Estender | Aceitar o resultado em vídeo no estágio out, mantendo o original em src. | REQ-VID-TRIM-011, REQ-VID-TRIM-017 |


### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
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














