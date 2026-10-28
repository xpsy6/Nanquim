# Nanquim

Navegador para Windows feito com o motor do Chrome (Chromium), com visual próprio de tinta e papel.

## Como instalar

1. Baixe o **Nanquim-Setup** mais novo em [Releases](https://github.com/xpsy6/nanquim/releases/latest) e abra.
2. Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações** e depois em **Executar assim mesmo**. Isso aparece porque o programa não tem a assinatura paga da Microsoft.
3. Clique em Avançar, escolha a pasta (ou deixe a sugerida) e pronto. Não pede senha de administrador.

Depois dessa instalação, o Nanquim se atualiza sozinho: procura versão nova ao abrir e a cada 2 horas, baixa por trás e instala quando você fecha o navegador (ou na hora, pelo botão "Atualizar" que aparece ao lado do menu).

O instalador cria atalhos na Área de Trabalho e no menu Iniciar e coloca o Nanquim na lista de navegadores do Windows. Para desinstalar, vá em Configurações do Windows, Aplicativos, Nanquim. Seus dados (favoritos, histórico, logins) ficam em `%APPDATA%\Nanquim`.

## Modo portátil (pendrive)

O Nanquim roda direto do pendrive sem gravar nada no disco C quando encontra uma pasta `Dados`:

- `Dados` ao lado do `Nanquim.exe`: tudo fica nessa pasta.
- Ou o formato `Nanquim\Programa\Nanquim\Nanquim.exe` com os dados em `Nanquim\Dados\Nanquim`.

No modo portátil, perfil, cookies, cache, senhas, arquivos temporários, registros e as atualizações baixadas ficam na pasta de dados. Os downloads vão para a pasta `Downloads` do pendrive. A atualização não instala sozinha ao fechar: aparece o botão "Atualizar", e ao clicar ela instala na mesma pasta do `Nanquim.exe`, sem atalhos e sem registro no Windows. Cada versão também sai em Releases como `Nanquim-x.x.x-portatil.zip`, para montar um pendrive novo.

Os logins dos sites e as senhas salvas são protegidos pela conta do Windows do computador onde foram salvos. Em outro computador o Nanquim abre com tudo, mas pede para entrar nos sites de novo, e as senhas salvas não abrem lá.

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
- Senha para abrir (Configurações, Privacidade e bloqueio): sem ela ninguém abre o Nanquim nem vê suas abas e contas. Dá para bloquear na hora (Ctrl+Shift+L) ou sozinho depois de um tempo parado. Não tem "esqueci a senha": sem ela não entra. Se esquecer, o único jeito é apagar a pasta `%APPDATA%\Nanquim`, o que apaga tudo (logins, favoritos, histórico). A senha não fica guardada: só um código embaralhado que serve para conferir
- Senhas salvas: ao entrar num site, o Nanquim pergunta se quer guardar o e-mail e a senha. Na próxima vez, clique no campo de login e escolha a conta. As senhas ficam criptografadas pela proteção do Windows. Dá para ver, copiar e apagar em Configurações, Senhas (pede a senha do Nanquim, se ela estiver ligada), e importar as senhas exportadas do Chrome
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
| Bloquear agora (com senha ligada) | Ctrl+Shift+L |

## Limites honestos

- Vídeos protegidos (Prime Video, Netflix, Crunchyroll, Spotify): o Nanquim usa o motor da castLabs, que traz o Widevine, e cada versão é assinada por eles. Na primeira vez ele baixa o Widevine do Google (uns 10 MB). A qualidade pode ficar em HD comum, como em outros navegadores que não são o Chrome ou o Edge, e algum serviço ainda pode recusar.
- Sincronizar favoritos e senhas entre computadores e a loja de extensões do Chrome não existem aqui.
- A senha impede que outra pessoa abra o Nanquim. Ela não criptografa os arquivos do computador: contra alguém mexendo direto nas pastas do Windows, o que protege é a senha do próprio Windows.
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
- Motor: Chromium, por meio do Electron (MIT), na versão [Electron for Content Security](https://github.com/castlabs/electron-releases) da castLabs, que inclui o Widevine
