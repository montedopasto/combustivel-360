# COMBUSTÍVEL 360 · Monte do Pasto

Aplicação de gestão de gasóleo agrícola: frontend HTML/CSS/JavaScript para GitHub Pages, Google Apps Script e Google Sheets privado. Interface PT-PT, industrial e mobile-first. Sem dependências de instalação para o frontend e sem serviços pagos obrigatórios.

**Estado da entrega:** código publicado no GitHub e frontend disponível em https://montedopasto.github.io/combustivel-360/. Testes e publicação passaram no GitHub Actions. O backend Google está publicado e ligado em `frontend/config.js`, e os dois acionadores foram instalados. Falta criar o primeiro Administrador e introduzir os valores reais dos depósitos. O logótipo permanece vazio até ser disponibilizado o ficheiro oficial. A autorização Google, a configuração dos dados reais e a validação integrada descrita em `docs/ACEITACAO.md` são necessárias antes da utilização operacional. Não foram criados dados de produção nem enviados emails reais.

## Começar

1. Seguir [INSTALACAO.md](docs/INSTALACAO.md): criar uma folha privada e um projeto Apps Script, importar `backend/`, configurar duas propriedades e executar a instalação.
2. Publicar o Apps Script e colocar o URL `/exec` em `frontend/config.js`.
3. Publicar `frontend/` no GitHub Pages, através do workflow incluído.
4. Abrir «Primeira instalação» e introduzir o código privado, o primeiro Administrador e os valores reais dos dois depósitos.
5. Criar matrículas, utilizadores e destinatários; instalar os acionadores.
6. Executar o roteiro de aceitação numa folha de homologação separada antes de usar produção.

Repositório dedicado: https://github.com/montedopasto/combustivel-360. Nenhum outro repositório foi alterado.

## O que está incluído

- PIN individual de 4–6 números, PBKDF2-HMAC-SHA256 com salt, 210 000 iterações e índice HMAC com pepper privado; sessões de uma hora e limitação persistente de tentativas.
- Administrador, Responsável e Colaborador, com permissões no servidor e operações administrativas autorizadas pela sessão do perfil Administrador.
- Trolho e Monte Ruivo, limites de capacidade, stock inicial, mínimo e custo inicial opcional.
- Abastecimentos, entradas, acertos físicos, correções de quantidade/preço e anulações com justificação.
- `LockService`, identificadores de operação persistidos no livro de movimentos, recuperação de reenvio e reconciliação de projeções.
- Pesquisa de matrículas, ativação/desativação e criação de utilizadores pela administração.
- Dashboard, seis gráficos Google Charts, histórico filtrado e relatórios por matrícula, utilizador, depósito, custos e períodos; Excel/PDF gerados pelo servidor.
- Custo médio ponderado por depósito, custos desconhecidos identificados como incompletos.
- Previsão com consumo recente, tendência limitada, sazonalidade apenas com história suficiente, confiança e prazo de entrega fixo de cinco dias.
- Sinais de abastecimentos invulgares, repetições próximas, alterações do consumo e diferenças físicas persistentes.
- Alertas programados com supressão de repetição e relatório mensal HTML/PDF.
- PWA instalável com ícones da aplicação; sem cache de dados, filas offline ou sincronização.

O ícone «360» é uma marca numérica da aplicação. Não representa nem substitui o logótipo oficial. A identidade oficial fica pendente do ficheiro original.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `frontend/` | Página, estilos, aplicação, comunicação, configuração pública, PWA |
| `backend/` | Módulos Apps Script e manifesto de permissões |
| `tests/` | Testes que executam o código real com serviços Google substituídos por adaptadores de teste |
| `docs/` | Instalação, arquitetura, limites, aceitação e resultado dos testes |
| `.github/workflows/` | Testar e publicar apenas o frontend no Pages |

## Testes locais

Requer Node.js 20 ou superior. Não é necessário instalar pacotes.

```sh
npm test
npm start
```

O segundo comando abre um servidor em `http://localhost:8080`. Sem um URL real do Apps Script o ecrã de acesso e a configuração inicial são navegáveis, mas não existe autenticação nem registo local. Não há modo demonstração.

Os testes usam registos artificiais exclusivamente na memória do processo de teste. Nunca os importar para o Sheets de produção. As chamadas MailApp e SpreadsheetApp nos testes não acedem à conta Google.

Consultar [ARQUITETURA.md](docs/ARQUITETURA.md), [ACEITACAO.md](docs/ACEITACAO.md) e [LIMITACOES.md](docs/LIMITACOES.md).

## Leitura por fotografia

Matrícula e litros podem ser preenchidos a partir de fotografias processadas no dispositivo, sem anexos nem uploads. O colaborador revê e confirma os valores antes de registar. Consulte [Funcionamento e limites](docs/FOTOGRAFIAS.md). A precisão em contadores reais ainda exige validação no local.

Os abastecimentos também aceitam veículos sem matrícula: o colaborador indica a identificação da máquina. O cadastro prévio deixou de ser obrigatório; os relatórios conservam a identificação introduzida.
