# Instalação e publicação

## 1. Preparar o Google Sheets

Criar uma folha de cálculo vazia na conta Google que será proprietária da aplicação. Guardar o seu ID real, obtido no endereço entre `/d/` e `/edit`. Não publicar a folha na Web nem partilhá-la com colaboradores da aplicação. O acesso deles será feito exclusivamente através do PIN.

Em **Extensões → Apps Script**, criar o projeto associado ou usar um projeto independente da mesma conta. Copiar os ficheiros `Core.gs`, `Crypto.gs`, `Store.gs`, `Api.gs`, `Reports.gs` e `Automation.gs` para ficheiros com os mesmos nomes. Remover a função de exemplo `myFunction` se existir. Ativar a apresentação do manifesto em Definições do projeto e substituir `appsscript.json` pelo fornecido.

## 2. Propriedades privadas

Em **Definições do projeto → Propriedades do script**, definir:

| Propriedade | Valor a fornecer |
|---|---|
| `SPREADSHEET_ID` | ID real da folha privada |
| `PAGES_ORIGIN` | Origem HTTPS do Pages, sem caminho e sem barra final; para o Pages da conta montedopasto será `https://montedopasto.github.io`, a confirmar no endereço publicado |

Não colocar estas propriedades nem o conteúdo da folha em ficheiros públicos. O ID da folha, embora não seja uma palavra-passe, não é necessário no frontend.

O editor não lista funções internas terminadas em `_`. Antes da primeira publicação, acrescentar temporariamente uma função pública `function prepararInstalacao(){ instalar_(); instalarAcionadores_(); }`, executá-la e autorizar os acessos pedidos. Remover essa função e guardar antes de publicar a aplicação Web. Nunca publicar a função temporária de instalação. A função prepara as onze folhas e gera três segredos nas propriedades privadas:

- `BOOTSTRAP_TOKEN`: código de utilização única para o primeiro Administrador.
- `PIN_PEPPER`: segredo de indexação dos PINs. Preservar em cópia privada; perdê-lo obriga a redefinir todos os PINs.
- `ADMIN_KEY`: segunda credencial para alterações administrativas sensíveis; guardar num gestor de palavras-passe e entregar apenas a Administradores autorizados. Não é o PIN de entrada.

A instalação é idempotente e não apaga folhas existentes. Usar uma folha vazia: não migrar dados de outra estrutura por sobreposição. As funções terminadas em `_` são internas; executam-se no editor e não são expostas como chamadas de cliente.

## 3. Publicar o Apps Script

Escolher **Implementar → Nova implementação → Aplicação Web**:

- Executar como: proprietário que está a publicar.
- Acesso: qualquer pessoa, incluindo utilizadores sem conta Google, porque a autorização da aplicação é feita pelos PINs.

A opção de acesso pode ser restringida pela organização Google Workspace; nesse caso o administrador da organização deve permitir esta arquitetura antes da utilização. Os dados continuam sujeitos à autenticação do servidor.

Copiar o URL real terminado em `/exec`. Não usar `/dev` e não colocar parâmetros de PIN/token no URL.

Editar `frontend/config.js`, preenchendo exclusivamente `apiUrl` com esse URL. `logoUrl` pode continuar vazio até haver um ficheiro original. Quando o ficheiro oficial for disponibilizado e houver autorização de publicação, copiá-lo sem modificações para `frontend/assets/` e usar o caminho relativo em `logoUrl`.

Em atualizações de backend, editar a implementação e selecionar uma nova versão. Uma gravação no editor não atualiza automaticamente a implementação já publicada.

## 4. Repositório e GitHub Pages

Criar um repositório dedicado na conta Monte do Pasto e carregar todo o conteúdo deste projeto, incluindo `.github/`. Não carregar propriedades privadas, backups do Sheets, PINs ou exportações reais.

Em **Settings → Pages → Source**, selecionar **GitHub Actions**. O workflow `pages.yml` testa o código e publica apenas `frontend/` quando a branch `main` muda. O projeto também pode ser publicado manualmente escolhendo `workflow_dispatch` em Actions.

Confirmar que `PAGES_ORIGIN` coincide exatamente com a origem do URL publicado, mesmo quando a aplicação está num subcaminho de repositório. Um domínio personalizado tem uma origem diferente e exige atualizar a propriedade. Só uma origem de produção é autorizada de cada vez.

Nenhuma credencial GitHub ou Google é necessária no JavaScript público. O URL do Apps Script é público por natureza; não concede acesso à folha sem sessão válida.

## 5. Inicialização da aplicação

Abrir o endereço Pages e selecionar **Primeira instalação**. Introduzir:

1. O `BOOTSTRAP_TOKEN` obtido nas propriedades privadas.
2. Nome e PIN individual do primeiro Administrador, com 4 a 6 números.
3. Capacidades, stocks iniciais medidos e mínimos dos depósitos Trolho e Monte Ruivo.
4. Custo inicial por litro apenas se for conhecido. Deixar vazio para marcar os custos como incompletos.

O servidor invalida o código de inicialização depois de criar a conta. Não existem PINs predefinidos. Entrar com o PIN criado. Usar a `ADMIN_KEY` nas alterações administrativas.

Adicionar matrículas reais e criar contas de Responsável e Colaborador. Definir os destinatários reais nas Configurações. A margem adicional de segurança começa em dois dias e pode ser ajustada; o prazo de entrega mantém-se em cinco dias.

## 6. Agendamento

A rotina temporária de preparação acima já instala os acionadores. Para os reinstalar posteriormente, criar temporariamente uma função pública que invoque `instalarAcionadores_`, executá-la no editor e removê-la antes de qualquer publicação Web. Cria:

- `verificarAlertas_`: de seis em seis horas.
- `relatorioMensal_`: primeiro dia do mês, aproximadamente às 08:00 de Lisboa, dentro da janela de execução atribuída pelo Google.

A rotina de instalação substitui apenas acionadores destas duas funções; não toca nos restantes. Os destinatários são os emails configurados, não todos os utilizadores. Os relatórios e alertas dependem das quotas da conta e de o proprietário manter as autorizações ativas.

## 7. Homologação antes da operação real

Criar uma segunda folha e um segundo projeto para testes; nunca testar anulações e quantidades artificiais na folha de produção. Seguir `ACEITACAO.md`, incluindo o transporte real em Safari/Android, duas sessões simultâneas, abertura de Excel e PDF e receção real dos emails. Só iniciar produção depois de confirmar estes passos.

Para testar o frontend a partir de localhost com backend real, usar uma implementação de homologação separada. Esta versão exige `PAGES_ORIGIN` HTTPS; publicar um Pages separado de homologação é a opção recomendada. Não enfraquecer a origem de produção.

## 8. Manutenção e recuperação

- Fazer cópias privadas periódicas da folha e das propriedades do script.
- Não editar manualmente a coluna JSON, IDs ou MOVIMENTOS durante a operação.
- Se uma escrita de projeções falhar, o stock continua a ser calculado pelo livro MOVIMENTOS. Executar `reconciliar_` no editor, que repõe saldos e projeções sem criar novos movimentos.
- Se um envio ficar sem confirmação, usar **Confirmar resultado do envio**. O mesmo identificador é preservado durante a sessão do separador, incluindo recarregamentos. Não criar um segundo abastecimento para substituir um envio incerto. Se o separador for fechado ou os dados locais forem apagados, o Responsável deve verificar o histórico antes de repetir.
- Alertas em `A_ENVIAR` ou `INCERTO` exigem confirmar a caixa de correio e as execuções Google. Não há reenvio automático ambíguo; isto evita duplicados, mas pode exigir recuperação manual de um email não entregue.
- Alterar um PIN invalida sessões anteriores. Desativar um utilizador impede novas operações imediatamente.
- Para rodar `ADMIN_KEY`, substituir a propriedade por um segredo aleatório forte num gestor de palavras-passe e redistribuir de forma privada. Nunca publicar a chave.
- Manter a conta proprietária com autenticação multifator. Apenas pessoas de confiança devem poder editar o Apps Script e a folha.
