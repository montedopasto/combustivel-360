# Arquitetura, segurança e contabilização

## Comunicação sem dependência de CORS

O frontend não usa `fetch` com cabeçalhos de autorização nem JSONP. Cria um formulário HTML transitório com um campo `payload`, enviado por HTTPS POST para o Apps Script num iframe oculto. O pedido contém uma ação, uma sessão opaca (quando autenticado) e um nonce aleatório de 192 bits. O Apps Script processa a operação e devolve um documento HtmlService que transmite a resposta por `window.top.postMessage`, com a origem exata definida em `PAGES_ORIGIN`.

O frontend aceita apenas origens de execução do Apps Script reconhecidas no código, o canal esperado e um nonce de um pedido pendente. Cada pedido tem um iframe e nonce distintos, prazo de 120 segundos e remoção dos elementos após confirmação. Não existem tokens em query strings, cookies de autenticação da aplicação, leitura direta da folha ou segredos fixos no cliente. Como o HtmlService pode executar num iframe Google interno, não se exige que `event.source` seja o iframe exterior; a correlação usa a origem Google e o nonce imprevisível.

`ALLOWALL` permite incorporar a resposta Google; a página de resposta não contém controlos operacionais nem solicita credenciais. A aplicação principal permanece no GitHub Pages. É obrigatório confirmar esta integração numa implementação real: as políticas de incorporação do Google, browsers e Workspace são externas ao projeto.

Referências oficiais: [HtmlOutput](https://developers.google.com/apps-script/reference/html/html-output), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service), [serviços HTML](https://developers.google.com/apps-script/guides/html/communication), [limitações do HtmlService](https://developers.google.com/apps-script/guides/html/restrictions).

## Identidade e perfis

Os PINs são exclusivamente numéricos, com 8–12 dígitos. O servidor guarda salt aleatório, número de iterações e resultado PBKDF2-HMAC-SHA256 (210 000 iterações, 32 bytes). Um índice HMAC com pepper privado permite localizar o PIN sem fazer uma derivação para cada utilizador e impede dois utilizadores com o mesmo PIN. Comparações de hashes usam percurso de comprimento constante. O algoritmo foi comparado com a biblioteca crypto do Node, incluindo o fator completo de produção.

O fator foi explicitamente escolhido para permitir execução no Apps Script; deve ser medido na conta de destino antes da entrada em serviço. Um PIN continua a ter entropia inferior a uma palavra-passe longa. O código limita a cinco tentativas por PIN e cem globais em dez minutos, com contadores nas propriedades privadas e exclusão mútua. A limitação global também pode bloquear temporariamente utilizadores legítimos durante abuso. Não existe proteção de rede contra consumo de quota por ataques públicos ao endpoint.

Sessões: identificador aleatório, apenas em memória do frontend; no Google Cache fica apenas a chave com SHA256 do identificador. Expiração absoluta de uma hora; o Google pode expulsar o cache mais cedo. Cada pedido reconsulta utilizador ativo e versão de PIN. As operações de escrita repetem esta verificação após obter o bloqueio. Alterações sensíveis exigem ainda `ADMIN_KEY`, guardada exclusivamente nas propriedades privadas e introduzida em cada alteração. Esta é uma segunda credencial, não TOTP nem MFA independente.

| Operação | Colaborador | Responsável | Administrador |
|---|---|---|---|
| Catálogo ativo sem stocks/custos | Sim | Sim | Sim |
| Abastecer | Sim | Sim | Sim |
| Dashboard, histórico, custos, exportações | Não | Sim | Sim |
| Entradas e acertos físicos | Não | Sim | Sim |
| Veículos, utilizadores, depósitos, configurações | Não | Não | Sim + chave |
| Corrigir ou anular | Não | Não | Sim + chave |

## Escritas e recuperação

Quantidades são inteiros em mililitros; entradas do utilizador admitem até três casas decimais. Preços são inteiros em milionésimos de euro por litro, com arredondamento monetário nos valores apresentados e agregação de custos arredondados por movimento.

Uma escrita obtém `getScriptLock`, consulta o livro atual, verifica permissões, operação já existente, matrícula, depósito e limites, e apõe uma única linha em MOVIMENTOS. Essa linha é o ponto de confirmação. ID, impressão do pedido, autor, quantidade, antes/depois e dados completos necessários à recuperação ficam juntos no JSON da linha. Depois atualiza as projeções ENTRADAS/ABASTECIMENTOS/ACERTOS/CORRECOES e o saldo visível de DEPOSITOS. Todas as quantidades são sempre recalculadas pelo livro, nunca somadas novamente a partir das folhas de origem.

Se a operação tiver sido confirmada mas a resposta ou projeção falhar, reenviar o mesmo ID devolve o resultado anterior e tenta reparar a projeção. Reutilizar esse ID com outro autor ou dados diferentes é rejeitado. O frontend conserva o ID e dados de um envio pendente em `sessionStorage` por utilizador, sem credenciais administrativas ou sessão. Isto serve apenas para confirmar um envio já iniciado online; nunca envia automaticamente nem aceita registos offline. Falhas determinísticas de validação libertam o pedido; falhas inesperadas ou de rede mantêm-no pendente.

`reconciliar_` pode reconstruir projeções e saldos a partir do livro. O Sheets não oferece transações de base de dados: alterações manuais ou scripts externos que ignorem o mesmo LockService não são protegidos. Deve haver um único projeto Apps Script a escrever nesta folha.

Correções/anulações são novas linhas com referência ao movimento raiz, dados anteriores, novos valores e motivo. A quantidade da nova linha é apenas a diferença líquida. Uma anulação não pode ser anulada uma segunda vez. Um acerto pode ser anulado; para corrigir uma medição, anular e medir novamente. As correções suportam quantidade e preço de entrada; para mudar matrícula, depósito ou fornecedor, anular e registar novamente com os dados certos. Não há exceções que permitam stocks negativos ou acima da capacidade.

## Tempo e custos

O relógio do servidor identifica sempre quem registou e quando. Apresentação e fronteiras diárias usam Europe/Lisbon. A entrega tem uma data de negócio adicional. Relatórios de aquisição usam a data de entrega; o histórico e balanço físico usam o instante de registo, porque uma entrega retrodatada não deve alterar silenciosamente a disponibilidade que já foi usada. O custo médio ponderado é recalculado pela ordem de registo dos movimentos efetivos, conservando a ordem de inserção quando têm a mesma milissegunda.

As correções reexpressam os custos dos movimentos subsequentes. O livro físico conserva a diferença na data da correção; um relatório reemitido pode, por isso, ter custos diferentes de uma emissão anterior. Custo inicial desconhecido torna o custo consumido incompleto até o stock com custo desconhecido ser esgotado; uma entrada posterior não inventa valor para o stock anterior. Acertos positivos usam o custo médio conhecido, se disponível.

O balanço por depósito é integral com filtros de datas/depósito. Filtros de matrícula, utilizador ou tipo produzem fluxos parciais; não devem ser interpretados como uma medição de stock físico. A interface e os documentos indicam esta limitação.

## Previsões

A média de 30 dias e a média de 7 dias (incluindo dias sem consumo) são combinadas em 60%/40%, com tendência limitada entre 0,5 e 1,5 e efeito amortecido por raiz quadrada. As primeiras semanas usam apenas o número de dias desde o primeiro consumo. A sazonalidade mensal só é aplicada depois de pelo menos 730 dias e dois meses homólogos anteriores comparáveis; nunca é inferida de uma estação incompleta.

Autonomia até zero e dias até ao mínimo são distintos. A encomenda é recomendada antes do mínimo por cinco dias mais a margem configurada. A quantidade visa capacidade à chegada, considerando consumo durante cinco dias e limitada à capacidade; deve ser revista por uma pessoa e não cria compras automaticamente. Sem consumo observado não há autonomia nem data inventadas. Confiança é preliminar, baixa ou moderada, baseada em duração e variabilidade, sem promessa de precisão.

Sinais por matrícula: quantidade superior à média dos últimos 30 abastecimentos mais três desvios e pelo menos 50% maior (mínimo dez referências), ou dois abastecimentos em menos de 30 minutos. Sinais por depósito: aumento de mais de 50% da média recente com base suficiente; três acertos negativos consecutivos. Não são conclusões de fraude ou avaria.

## Automatismos

Acionadores executam análises sem abrir a aplicação. Um alerta enviado fica aberto e não é repetido para o mesmo nível até haver recuperação ou escalada para outro nível. A recuperação marca os alertas como resolvidos. O mensal usa uma chave única por ano/mês.

Antes de enviar, grava-se uma reserva `A_ENVIAR`. Após envio, `ENVIADO`. Uma falha ambígua fica `INCERTO` e requer revisão; não se promete entrega exatamente uma vez, porque email e Sheets não partilham uma transação. Esta política privilegia impedir repetições automáticas. A saída normal da situação permite futuros alertas.
