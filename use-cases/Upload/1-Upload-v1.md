# 📝 Exercício 1 — Template de Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS


---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | Grupo 6 - PL5 |
| **Autores** | João Bernardo (pg65418); nome (nº); … |
| **Data** | {2026-10-06} |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Carregar Vídeo (Upload) |
| **Perfil(s) de utilizador abrangido(s)** | Registado e Premium. O armazenamento e processamento de vídeos exigem mais recursos quando comparado com imagens. Por isso, o carregamento de vídeos é limitado a perfis registados e premium. |

**Justificação no contexto do MVP** *(2–3 linhas)*

O carregamento de vídeos é a funcionalidade base do suporte a vídeo: todas as restantes (por exemplo: recortar, aplicar filtros, etc...) dependem de um vídeo já disponível na biblioteca do utilizador. Sem ela, não é possível utilizar nem validar nenhuma operação do suporte a vídeo. Implementá-la obriga a tomar decisões relacionadas aos formatos e limites aceites.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Carregamento de vídeos |
| **Versão** | v1.0 |
| **Autor** | João Bernardo |
| **Data** | 2026-10-04 |
| **Objetivo** | Permite ao utilizador carregar um ou mais vídeos para um projeto, de modo a poder aplicar operações de edição de vídeo posteriormente. |
| **Âmbito** | Módulo de vídeo do PictuRAS - carregamento de ficheiros |
| **Ator Principal** | Utilizador registado ou premium |
| **Stakeholders e Interesses** | - **Utilizador**: quer submeter os seus vídeos de forma fiável, incluindo os motivos de uma eventual recusa<br>- **Proprietário do Sistema**: Pretende controlar o custo de armazenamento e processamento<br>- **Equipa de Desenvolvimento:** Valida o armazenamento e a gestão de ficheiros grandes |
| **Pré-condições** | - O utilizador tem sessão iniciada |
| **Trigger** | O utilizador inicia o carregamento de um ou mais vídeos através de uma zona de drag and drop na biblioteca, num novo projeto ou num projeto existente |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a biblioteca | Apresenta a listagem de projetos |
| 2 | O utilizador seleciona 'New Project' | Apresenta uma caixa para definir o nome do projeto e uma zona de *drag and drop* para submissão de ficheiros |
| 3 | O utilizador arrasta ou seleciona os ficheiros para carregamento | Os videos são validados quanto ao formato e tamanho, imagens seguem o fluxo existente  |
| 4 | - | Inicia o carregamento dos ficheiros que passaram a verificação |
| 5 | - | O sistema indica que o carregamento está em curso e, quando termina, apresenta o resultado. |
| 6 | - | Se pelo menos um ficheiro foi carregado com sucesso, cria o projeto e associa-lhe esses ficheiros |
| 7 | - | Abre e apresenta o projeto |


### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 - Upload através de biblioteca | O utilizador arrasta um ou mais ficheiros para a zona de drag and drop da biblioteca → o sistema apresenta a interface para definir o nome do novo projeto → após o utilizador definir o nome, o sistema valida os ficheiros → o fluxo continua no passo 4. |
| FA2 - Adicionar vídeo a projeto existente | O utilizador abre um projeto e seleciona *Add Image* → o sistema apresenta a zona de drag and drop para seleção de ficheiros → o utilizador seleciona um ou mais vídeos → o sistema valida os ficheiros → o sistema inicia o carregamento dos vídeos válidos → após o carregamento, associa os vídeos carregados com sucesso ao projeto existente |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| Formato não suportado | Apresenta o erro "Ficheiro com formato inválido", indica os formatos aceites e descarta o ficheiro; os restantes seguem normalmente. |
| Tamanho excede o limite do sistema | Apresenta o erro "Ficheiro excede o tamanho máximo permitido" e descarta o ficheiro; os restantes seguem normalmente. |
| Falha a meio do carregamento | Apresenta o erro "Carregamento falhou" e descarta o ficheiro; os restantes seguem normalmente |
| Nenhum ficheiro é carregado com sucesso | Informa o utilizador de que nenhum ficheiro foi carregado e não cria novo projeto |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | Todos os vídeos que passaram a verificação e foram carregados com sucesso ficam associados ao projeto e disponíveis para operações de edição de vídeo |
| Garantia Mínima | Nenhum ficheiro rejeitado ou cujo carregamento tenha falhado fica associado ao projeto; dados parciais não ficam armazenados; os vídeos carregados com sucesso mantêm-se disponíveis; quando nenhum ficheiro é carregado com sucesso, o novo projeto não é criado; o utilizador é informado dos eventuais erros. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | O carregamento de vídeos só está disponível para utilizadores registados e premium |
| RN2 | O carregamento de vídeos não é contabilizado como uma das 5 operações diárias para utilizadores registados |
| RN3 | Um utilizador pode carregar um ou mais vídeos numa única operação. |
| RN4 | Os ficheiros válidos e carregados com sucesso são adicionados ao projeto; os ficheiros rejeitados ou cujo carregamento falhe não são associados ao projeto e não interrompem o carregamento dos restantes ficheiros. |
| RN5 | Apenas os vídeos que cumpram os formatos e limites definidos pelo sistema podem ser carregados |
| RN6 | Um novo projeto só é criado quando pelo menos um ficheiro é carregado com sucesso. |


### 2.7 Assunções


| **ID** | **Assunção** |
|--------|--------------|
| A1 | As zonas de *drag and drop* já existem na plataforma e são reutilizadas para este caso de uso |
| A2 | Um projeto pode misturar imagens e vídeos |
| A3 | Quando o utilizador submete imagens e vídeos em simultâneo, as imagens seguem o fluxo já existente e os vídeos seguem este caso de uso. |
| A4 | O botão *Add Image* já existente passa a aceitar também vídeos. |
| A5 | O sistema apenas indica que o carregamento está em curso, sem barra de percentagem |
| A6 | Um carregamento que falhe não é retomado, o utilizador tem de voltar a submeter o ficheiro |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | Quais os formatos de vídeo suportados pelo sistema? |
| Q2 | Qual o tamanho máximo permitido para cada vídeo? |
| Q3 | Existe uma duração máxima permitida para cada vídeo? |
| Q4 | Existe um limite máximo de vídeos que podem ser carregados numa operação/projeto? |
| Q5 | Q1 a Q4 diferem de acordo com o perfil do utilizador? |


---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| ChatGPT | Apoio na estruturação e revisão do caso de uso | Revisão manual do conteúdo pela equipa, verificando o alinhamento com o enunciado, o template e as regras do PictuRAS |

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

> ⛔ **Não preencher no Exercício 1.** Esta secção será trabalhada na aula seguinte, a partir do caso de uso das secções 2.1 a 2.8. Fica aqui para que conheçam o passo seguinte — veja a secção com o mesmo nome no exemplo de vídeo.

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| REQ-VID-UPLOAD-001 | O sistema deve permitir ao utilizador submeter um ou mais vídeos numa única operação de carregamento | F | Deve ter | NOVO | Trigger, Passo 3, RN3 | Dado um utilizador registado, quando submete 3 vídeos válidos de uma vez, então os 3 são aceites para validação. |
| REQ-VID-UPLOAD-002 | O sistema deve aceitar vídeos nas zonas de drag and drop. | F | Deve ter | ALT | Trigger, FA1, A1 | Quando se arrasta um MP4 válido para a zona, então o sistema pede o nome do novo projeto e valida o ficheiro. |
| REQ-VID-UPLOAD-003 | O sistema deve permitir ao utilizador adicionar vídeos a um projeto existente através do botão Add Image. | F | Deve ter | ALT | FA2, A4 | Quando se carrega um vídeo válido através de Add Image, então o vídeo fica associado ao projeto. |
| REQ-VID-UPLOAD-004 | O sistema deve impedir o carregamento de vídeos por utilizadores que não tenham perfil registado ou premium. | NF | Deve ter | ALT | RN1, Pré-condição | |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| {…} | {…} | {…} | {…} |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| Passo 1 | {…} | REQ-VID-…-001 |
