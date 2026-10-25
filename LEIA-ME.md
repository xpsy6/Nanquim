# Nanquim

Navegador para Windows feito com o motor do Chrome (Chromium), com visual próprio de tinta e papel.

## Como instalar

1. Baixe o **Nanquim-Setup** mais novo em [Releases](https://github.com/xpsy6/nanquim/releases/latest) e abra.
2. Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações** e depois em **Executar assim mesmo**. Isso aparece porque o programa não tem a assinatura paga da Microsoft.
3. Clique em Avançar, escolha a pasta (ou deixe a sugerida) e pronto. Não pede senha de administrador.

Depois dessa instalação, o Nanquim se atualiza sozinho: procura versão nova ao abrir e a cada 2 horas, baixa por trás e instala quando você fecha o navegador (ou na hora, pelo botão "Atualizar" que aparece ao lado do menu).

O instalador cria atalhos na Área de Trabalho e no menu Iniciar e coloca o Nanquim na lista de navegadores do Windows. Para desinstalar, vá em Configurações do Windows, Aplicativos, Nanquim. Seus dados (favoritos, histórico, logins) ficam em `%APPDATA%\Nanquim`.

## O que ele faz

- Abas com arrastar para reordenar, fixar, silenciar, duplicar, reabrir fechada (Ctrl+Shift+T) e suspender
- Barra de endereço que pesquisa ou abre sites, com sugestões do histórico, favoritos e do Google
- Bloqueador de anúncios e rastreadores (lista pública com dezenas de milhares de domínios, atualizada toda semana), com pulo automático de anúncio no YouTube e botão para liberar um site
- Barra lateral estilo Opera GX com WhatsApp, Instagram, Discord, Spotify, Telegram e YouTube Music (e qualquer site que você adicionar). O painel abre por cima da página, sem dividir a tela, fecha ao clicar fora (ou fica fixo, se você preferir) e muda de largura arrastando a borda (até ocupar a área toda). Enquanto o site carrega aparece o ícone dele; se algo der errado, o painel explica o motivo e oferece tentar de novo
- Medidor de RAM e processador, limite de memória e suspensão automática de abas paradas
- Janela anônima (Ctrl+Shift+N) que não guarda nada
- Favoritos com barra, gerenciador, importar e exportar (do Chrome, Edge, Opera)
- Histórico com busca, downloads com pausar e continuar, localizar na página, zoom, imprimir, salvar página
- Permissões de câmera, microfone e localização perguntando antes
- Continua de onde parou ao abrir de novo
- Dois temas (Tinta escuro e Papel claro)
- Cores escolhíveis: o círculo da nova aba e os detalhes (carimbo, abas, botões) têm cor própria, com combinações prontas (vermelho, roxo, roxo e vermelho, azul, verde, dourado, tinta) ou qualquer cor
- Ícones oficiais dos sites na barra lateral e nos atalhos da nova aba (embutidos, aparecem até sem internet)
- Print igual ao do Opera (Ctrl+Shift+5 ou o botão de câmera): escolha uma área, a área visível ou a página inteira, desenhe com caneta, marca-texto, seta, retângulo, texto e desfoque. A imagem já fica copiada para colar com Ctrl+V; salvar no computador só quando você pedir
- Login do Google: na página de login o Nanquim usa a identidade original do motor (Electron), que o Google aceita no fluxo para navegadores embutidos
- Ferramentas do desenvolvedor (F12) e extensões do Chrome descompactadas (experimental)

## Atalhos

| Ação | Atalho |
| --- | --- |
| Nova aba / fechar aba | Ctrl+T / Ctrl+W |
| Reabrir aba fechada | Ctrl+Shift+T |
| Trocar de aba | Ctrl+Tab ou Ctrl+1 a 9 |
| Barra de endereço | Ctrl+L ou F6 |
| Localizar | Ctrl+F |
| Favoritar | Ctrl+D |
| Histórico / Downloads | Ctrl+H / Ctrl+J |
| Janela anônima | Ctrl+Shift+N |
| Mostrar ou esconder barra lateral | Ctrl+Shift+S |
| Mostrar ou esconder favoritos | Ctrl+Shift+B |
| Zoom | Ctrl + / Ctrl - / Ctrl 0 |
| Tela cheia | F11 |
| Tirar print | Ctrl+Shift+5 |

## Limites honestos

- Netflix, Disney+ e Prime Video não tocam filmes: eles exigem uma licença paga do Google (Widevine) que só navegadores grandes recebem.
- Sincronizar favoritos e senhas entre computadores e a loja de extensões do Chrome não existem aqui.
- Login do Google funciona, mas de vez em quando o Google pode pedir verificação extra por não reconhecer o navegador.

## Mexer no código

Precisa do Node.js 20 ou mais novo.

```
npm install
npm start          # abre o navegador para testar
npm run dist       # gera o instalador e o portátil na pasta dist (rodar no Windows)
npm run dist:linux-installer   # alternativa no Linux, usando o build/installer.nsi
```

Estrutura:

- `src/main`: núcleo (abas, janelas, downloads, bloqueador, dados salvos)
- `src/ui`: a barra de cima e a lateral
- `src/pages`: páginas internas (nova aba, histórico, favoritos, downloads, configurações, erro)
- `src/fonts`: fontes Shippori Mincho, Zen Kaku Gothic e IBM Plex Mono (licença livre OFL)

## Créditos

- Ícones de marcas: [SVG Logos](https://github.com/gilbarbara/logos) de Gil Barbara (CC0) e [Skill Icons](https://github.com/tandpfun/skill-icons) (MIT), via Iconify
- Motor: Chromium, por meio do Electron (MIT)
