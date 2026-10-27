# Aceitação antes de produção

Executar na implantação de homologação, com uma folha separada da produção. Os valores de teste são definidos pelo responsável pela homologação e não devem permanecer em produção. Registar resultado, data, navegador e pessoa que verificou cada cenário.

| Cenário | Verificação local | Verificação integrada necessária |
|---|---|---|
| Colaborador entra com PIN e abastece | Teste da lógica de login e saída | Login pelo Pages em Android e iPhone; confirmação simples sem stock/custos |
| Colaborador não consulta administração | Todos os endpoints administrativos rejeitados; catálogo mínimo | Tentar ações manipuladas com sessão de Colaborador |
| Saída usa o depósito certo | Saldos independentes verificados | Confirmar saldo da folha e dashboard nos dois depósitos |
| Duas saídas simultâneas | Exclusão e duas tentativas concorrentes no adaptador | Enviar de dois dispositivos pedidos cuja soma excede o saldo; só um deve passar |
| Reenvio não duplica | Mesmo ID repetido; mudança de payload rejeitada | Cortar a resposta de rede depois do envio e confirmar a operação pendente |
| Entrada aumenta stock | Quantidade e custo verificados | Registar entrega real de homologação e comparar saldo |
| Capacidade não excedida | Entrada excessiva rejeitada | Verificar mensagem da interface e ausência de movimento |
| Correção ajusta saldo | Diferença líquida, custo e conservação do original | Corrigir quantidade/preço com sessão de Administrador e observar relatório |
| Anulação preserva histórico | Original + correção/anulação continuam; segundo estorno rejeitado | Confirmar linhas MOVIMENTOS/CORRECOES e stock após anulação |
| Acerto conserva motivo | Justificação e rejeição de stock desatualizado | Registar medição e confirmar histórico e exportação |
| Matrícula desativada indisponível | Catálogo e servidor rejeitam; duplicados normalizados | Desativar enquanto há formulário aberto e tentar enviar |
| Relatórios respeitam filtros | Datas, matrícula, utilizador, tipo e depósito | Comparar tabela e ficheiros exportados para o mesmo filtro |
| Excel e PDF corretos | Matriz de valores e HTML verificados | Abrir XLSX em Excel/LibreOffice e PDF num leitor; verificar nomes, período, emissão, valores, acertos e paginação |
| Emails não repetem situação | Supressão, recuperação e chave mensal verificadas com MailApp de teste | Enviar duas análises reais na homologação e confirmar uma mensagem; testar recuperação e escalada |
| Prazo de cinco dias | Data, margem e quantidade verificadas | Rever previsão com histórico de homologação, incluindo ausência de dados |
| Mobile e desktop | Acesso/configuração inicial observados em browser estreito | Testar todos os ecrãs autenticados em Android, iPhone, tablet e desktop; teclado numérico, contraste e ausência de deslocamento horizontal desnecessário |

## Autenticação e arranque

Confirmar criação do primeiro Administrador com código privado e impossibilidade de repetir bootstrap. Confirmar PINs únicos, tentativas limitadas, expiração, desativação, invalidação após alteração de PIN e operações administrativas sem chave adicional, vedadas aos outros perfis. Verificar que não há matrículas/utilizadores demonstrativos na folha de produção.

## Integração de transporte

Usar o Pages publicado e a implantação `/exec` real. Confirmar sucesso de uma operação através do POST/iframe e resposta postMessage. Confirmar rejeição de uma origem diferente e de mensagens sem nonce pendente. Testar proteção de cookies de terceiros e modo privado dos browsers usados no terreno. Se a política Google bloquear a incorporação, não colocar em produção; investigar a implantação/política Workspace e repetir a aceitação.

## Integridade e recuperação

Testar numa cópia a interrupção após o commit do livro e antes de concluir a projeção. Reenviar o ID e executar `reconciliar_`; verificar que existe exatamente um movimento, um registo de origem e saldo coerente. Confirmar que nenhum utilizador da aplicação tem acesso direto de edição à folha. Não forçar estes erros na produção.

## Automatismos

Confirmar os dois acionadores na conta correta e fuso de Lisboa. Enviar um relatório mensal de homologação para destinatários de teste escolhidos pelo utilizador. Rever HTML, PDF, mês anterior, evolução, acertos, alertas e previsão. Confirmar o procedimento manual para estados de envio incertos e as quotas da conta.

## Critério de entrada em serviço

Todos os cenários integrados devem passar. As verificações locais não substituem o Google real nem dispositivos físicos. Guardar a evidência numa pasta privada, sem PINs, tokens ou segredos. Enquanto estes passos estiverem pendentes, o projeto deve ser tratado como implementação entregue para configuração e homologação, não como serviço operacional validado.
