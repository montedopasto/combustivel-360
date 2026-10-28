# Abastecimentos por fotografia

O formulário mantém o preenchimento manual e acrescenta **Fotografar matrícula** e **Fotografar contador**. No telemóvel, o seletor pede preferencialmente a câmara traseira; o comportamento depende do navegador. No computador pode escolher uma imagem. Selecionar o depósito, fotografar, selecionar com o dedo apenas a zona dos caracteres e escolher **Ler zona selecionada**. Rever os campos e assinalar a confirmação antes de registar. Uma leitura nunca grava um abastecimento automaticamente.

O contador deve mostrar os litros da operação, incluindo o separador decimal. Esta funcionalidade não calcula diferenças de totalizadores acumulados. Se existirem vários números na imagem, selecionar apenas os litros. Uma matrícula não precisa de constar previamente do catálogo. Uma leitura com vários resultados ou com baixa confiança não preenche automaticamente o campo. Não se substituem letras por números para adivinhar matrículas. O grau de confiança do motor não garante que uma leitura esteja correta.

## Privacidade e funcionamento

As imagens são abertas numa área temporária de memória do navegador e processadas por Tesseract.js 6.0.1/WebAssembly no próprio dispositivo. Não há uploads de fotografias para o Apps Script, Google Drive, Google Sheets ou serviços de OCR. Os inputs de ficheiro não têm nome e são esvaziados após a seleção; o pedido de abastecimento contém exclusivamente tipo de operação, depósito, veículo, litros e identificador anti-duplicação. Não se guardam imagens em localStorage, sessionStorage, IndexedDB ou no service worker. Fechar a leitura liberta os canvases e termina o worker; não se promete apagar cópias que o sistema do telemóvel possa guardar fora da aplicação.

O motor e os seus modelos públicos são descarregados por HTTPS quando se pede uma leitura (Tesseract.js via jsDelivr, modelo inglês para caracteres latinos e números). Estes downloads podem ser demorados na primeira utilização e precisam de Internet; não incluem a fotografia. O motor usa `cacheMethod: none` para o modelo. O navegador pode manter os ficheiros públicos do motor no seu cache normal. Sem ligação ou se uma dependência não carregar, usar preenchimento manual. Não há API paga, chave de OCR ou alteração de permissões do Google.

Imagens limitadas a 25 MB, com redução do lado maior a 1800 píxeis para controlar a memória; formatos não suportados pelo navegador, como certas fotografias HEIC, devem ser convertidos para JPEG/PNG ou substituídos pelo preenchimento manual. A seleção da zona de leitura permite ampliar os caracteres antes do reconhecimento. Há cancelamento e limite de tempo da leitura. O reconhecimento de dígitos segmentados, reflexos e imagens desfocadas pode falhar.

## Validação

- Testes automáticos: matrículas com e sem correspondência no catálogo, normalização, ambiguidade e separadores numéricos portugueses.
- Navegador: motor real aplicado a imagens sintéticas com `AA-12-BB` e `123.45`, sem criar dados de produção. Verificados o seletor de imagem, preenchimento dos dois campos, bloqueio enquanto falta a confirmação e confirmação final num formulário isolado.
- A validar no local: fotos reais dos depósitos, contadores mecânicos/digitais, luz exterior, Android e iPhone. Não foi medida precisão de reconhecimento em equipamentos reais. Confirmar sempre os valores antes do registo.

Referência do motor: https://github.com/naptha/tesseract.js e respetiva licença Apache-2.0.

## Veículos sem matrícula

Assinalar **Veículo sem matrícula** no formulário e preencher **Identificação do veículo ou máquina** (mínimo 3 caracteres, máximo 120). A fotografia da matrícula deixa de ser solicitada; a leitura dos litros continua disponível. Não é necessário um cadastro prévio. Veículos com matrícula podem igualmente abastecer sem cadastro prévio. Registos que correspondam a um veículo expressamente desativado continuam bloqueados. A identificação é conservada nos movimentos, projeções e exportações e fica disponível para filtros de relatórios. Identificações iguais, sem diferenças de maiúsculas ou espaços, são agrupadas; usar nomes distintivos e consistentes para máquinas diferentes. As descrições não criam nem alteram o cadastro de veículos automaticamente. No cadastro administrativo, a matrícula é opcional e a identificação torna-se obrigatória quando não existe matrícula.

Para guias de postos externos, consulte [Abastecimentos externos](ABASTECIMENTOS-EXTERNOS.md). A leitura de escrita à mão é experimental e apenas propõe valores que o utilizador deve comparar com o papel; a guia enviada não teve reconhecimento fiável.
