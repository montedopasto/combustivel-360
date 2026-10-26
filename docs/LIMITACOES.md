# Estado de validação e limites conhecidos

O frontend e o backend estão publicados, a folha privada foi preparada e os dois acionadores foram instalados. A comunicação real POST/iframe/postMessage foi confirmada no navegador através da rejeição de um PIN inválido. A inicialização com o primeiro Administrador e os dados reais dos depósitos continua pendente. Ainda não equivale à aceitação operacional completa.

## Dependências de intervenção humana

- Criar/selecionar o repositório dedicado, publicar o Pages e confirmar o endereço real.
- Criar a folha privada e o Apps Script na conta de destino; autorizar os serviços e publicar o endpoint.
- Introduzir os IDs/URL reais; guardar os segredos gerados no local privado adequado.
- Fornecer o ficheiro original do logótipo oficial.
- Introduzir capacidades, stocks, custo inicial se conhecido, utilizadores, matrículas e destinatários reais.
- Os acionadores já estão instalados; validar o envio com destinatários reais apenas depois da configuração.

## Testado localmente

O ficheiro `testes-locais.tap` regista o resultado dos testes do código real. Os adaptadores de teste substituem exclusivamente os serviços Google e não contactam a conta. Cobrem autenticação, permissões, catálogo sem dados administrativos, integridade, deduplicação, limites, correções, anulações, acertos, matrículas, filtros, custos, interrupções, previsões, contenção do bloqueio e supressão de alertas. A derivação criptográfica foi comparada com implementação independente também nas 210 000 iterações reais.

O browser carregou a interface real, confirmou o ecrã de acesso e a navegação para configuração inicial num painel estreito de aproximadamente 312 px, sem registos fictícios. O ficheiro `acesso-mobile.png` documenta esse estado. Não foi possível autenticar nesse browser sem a instalação Google real; ecrãs administrativos completos e dispositivos físicos continuam sujeitos à aceitação.

## Ainda não validado em serviço real

- Compatibilidade do POST/iframe/postMessage em Safari/iPhone e Android físicos. A comunicação real já foi confirmada no navegador da instalação, com resposta do servidor a um PIN inválido.
- Execução concorrente em processos Apps Script distintos. Localmente valida-se a exclusão e sequência protegida; o teste de duas sessões reais é obrigatório.
- Latência do PIN no runtime Apps Script e comportamento sob carga/quotas.
- Receção real de emails, janela dos acionadores e anexo PDF mensal.
- Criação, abertura e paginação real dos ficheiros XLSX/PDF pelo Google. A matriz de dados exportados e HTML foram testados; não se apresentam estes testes como validação dos serviços de conversão.
- Instalação PWA em dispositivos físicos e layouts desktop completos depois da autenticação.

## Limites operacionais e de âmbito

A leitura do livro, custos e relatórios percorre o histórico; não há paginação ou arquivo automático nesta versão. Folhas grandes podem exceder latência, memória, limite de célula JSON (50 000 caracteres) ou quotas de Apps Script. As projeções de novas operações são incrementais, mas a reconciliação completa deve ser feita em manutenção. Medir com o volume esperado antes de operar em larga escala; não há promessa de capacidade não medida.

Relatórios com muitos movimentos podem exceder tamanho/tempo de HtmlService, conversão PDF, exportação Sheets ou transporte do browser. Aplicar períodos menores. Os PDFs usam tabelas HTML e a conversão Google; o layout exato deve ser validado na conta de destino.

O relatório de matrícula permite análise diária, mensal, anual, por depósito e comparação de períodos através dos filtros e gráficos. Para mudar depósito/matrícula/fornecedor de um movimento é necessário anular e registar novamente; a edição direta limita-se a quantidade e preço. O formato do depósito não permite exceder capacidade em situações excecionais: é uma restrição deliberada de segurança.

A sazonalidade precisa de histórico suficiente e pode não ser ativada mesmo após dois anos se não houver meses homólogos completos. Previsões sem dados são indisponíveis; não há histórico importado, dados demonstrativos ou IA paga.

O ícone numérico PWA é da aplicação, não o logótipo da Monte do Pasto. Sem o ficheiro original, a identidade usa apenas o nome da empresa.

Sessões vivem no cache Google e podem expirar antes de uma hora. Um ataque ao endpoint público pode gastar quotas apesar dos limites de PIN; não há firewall/rate limit de infraestrutura nas tecnologias permitidas. Os contadores de tentativas não constituem um histórico de logins nem existe um módulo de auditoria geral.

O modelo de stock é protegido dentro deste projeto Apps Script. Alterações diretas no Sheets, outros scripts ou editores com acesso à conta não seguem esse bloqueio e podem comprometer a integridade. Guardar a folha e o script privados.

Os envios pendentes são recuperáveis enquanto o `sessionStorage` do separador existir. Após fechar o separador, apagar dados ou usar outro dispositivo, confirmar o histórico com um Responsável antes de repetir um envio incerto.

As bibliotecas Google Charts são carregadas da Google; se indisponíveis, os dados continuam consultáveis em tabelas. A aplicação requer Internet e não regista offline. As funcionalidades gratuitas continuam sujeitas a quotas e às políticas de acesso Google e GitHub.
