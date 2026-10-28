# Abastecimentos externos — conferência com a fatura

Os próprios colaboradores registam abastecimentos feitos em postos externos através do menu **Abastecimentos externos**. O formulário exige apenas a **data da guia**, a **matrícula ou identificação do veículo** e os **litros**. O servidor acrescenta automaticamente o autor e a data/hora do lançamento, sem pedir preço, custo, fornecedor, quilómetros ou número da guia. A data de abastecimento pode ser anterior ao lançamento; datas futuras e inexistentes são rejeitadas. A guia apresentada durante o desenvolvimento indica **640 litros**, não 64,0; o software não introduz nem desloca separadores decimais para adivinhar uma quantidade.

## Fotografias e manuscritos

É possível escolher/fotografar uma única guia, selecionar com o dedo a zona da data, matrícula ou quantidade e pedir a leitura desse campo. As leituras são **propostas editáveis**: confirmar/corrigir e escolher **Utilizar valor confirmado** para preencher o formulário. Ao terminar, escolher **Concluir**, rever os três campos e assinalar a confirmação antes de registar. O preenchimento manual está sempre disponível.

A leitura de manuscritos é experimental. Na fotografia real fornecida, a data e a matrícula não foram reconhecidas com segurança e os algarismos da quantidade foram inicialmente lidos incorretamente. Por isso, não foi validada uma extração automática fiável desta guia. Não se deve registar um valor sem o comparar com o papel. A interface avisa e exige confirmação; o reconhecimento não envia um abastecimento automaticamente.

As fotografias são processadas apenas na memória do dispositivo e libertadas ao fechar o leitor ou sair da página. Não são anexadas, enviadas ao servidor nem guardadas no Drive/Sheets ou armazenamento persistente da aplicação. O navegador pode descarregar/cachear ficheiros públicos do motor OCR, conforme descrito em FOTOGRAFIAS.md.

## Consulta e exportações

O Responsável e o Administrador têm, nessa mesma área, uma consulta com **data inicial e data final**, veículo e colaborador. As datas são inclusivas e referem-se ao dia do abastecimento da guia, não ao dia de lançamento na aplicação. São apresentados o detalhe (data, veículo, litros e autor), total de litros, quantidade de registos e totais por veículo. Excel e PDF respeitam os filtros **aplicados**; depois de mudar as datas, escolher **Aplicar datas e filtros** antes de exportar.

Registos iguais em data, veículo e litros são sinalizados para conferência. A marca não prova duplicação nem exclui registos automaticamente: podem existir dois abastecimentos legítimos iguais no mesmo dia. Como não se guarda o número da guia, não é possível identificar inequivocamente a repetição do mesmo documento quando é lançado com outro identificador de operação. Os reenvios do mesmo pedido mantêm o identificador e nunca criam uma segunda linha.

O Administrador pode anular um registo mediante justificação. A anulação é uma nova linha, conserva o original e retira-o dos totais. Para corrigir, anular e lançar os dados certos. O Responsável consulta/exporta mas não anula. O Colaborador apenas regista; não pode consultar os abastecimentos dos restantes utilizadores nem exportar relatórios.

## Dados e atualização

O backend acrescenta a folha privada **ABASTECIMENTOS_EXTERNOS**, criada automaticamente sob bloqueio no primeiro registo. Não é necessário executar novamente a instalação. Cabeçalhos: ID, Tipo, Data do abastecimento, Veículo / matrícula, Litros, Colaborador, Data do registo, Referência, Motivo, JSON.

Esta folha é um livro de registos independente, com identificador único de operação, impressão do pedido, `LockService`, validação de sessão/permissões após obter o bloqueio e uma única linha como ponto de confirmação. Uma resposta interrompida pode ser repetida com o mesmo ID. A interface conserva o tipo de operação pendente para distinguir abastecimentos internos, externos e anulações, inclusive após recarregar o separador.

**Não há movimentos de stock nem custos** associados a estas linhas: não alteram o Trolho, Monte Ruivo, os custos médios, previsões de reposição ou gráficos dos depósitos. A conferência externa encontra-se na área própria, separada dos relatórios internos existentes. O email mensal dos depósitos continua a referir-se aos depósitos; os abastecimentos externos são exportados na consulta própria para validar a fatura.

Para instalação nova, incluir também `backend/External.gs` (ou juntar os sete módulos no editor, pela ordem documentada). Para atualizar uma instalação existente, carregar o código atualizado e publicar uma versão nova da **mesma implementação**; atualizar o frontend pelo GitHub Pages. As permissões Google não mudam.

## Validação efetuada

- Testes automáticos: perfis, registo de 640 L sem alterar stocks, datas válidas/passadas, rejeição de datas futuras, identificação, decimais, deduplicação e recuperação de uma resposta interrompida, criação idempotente da folha, filtros por datas/veículo/autor, tabelas de exportação, anulações e possíveis repetições.
- Google Apps Script real: geração de PDF (42 546 bytes) e XLSX (7 073 bytes) para um período sem registos; assinaturas dos formatos verificadas. A folha temporária de exportação foi enviada para o lixo e a função temporária de verificação foi removida antes da publicação. Não foram criados abastecimentos fictícios na produção.
- Os detalhes e totais com registos foram validados com adaptadores locais, sem inserir dados fictícios na folha real.
- Leitor testado com a fotografia da guia enviada. A escrita à mão não teve leitura fiável; permanece necessária a revisão/preenchimento manual.
