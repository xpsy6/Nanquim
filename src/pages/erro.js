'use strict';

const params = new URLSearchParams(location.search);
const url = params.get('u') || '';
const code = params.get('c') || '';
const raw = params.get('d') || '';
const n = Number(code);

let title = 'Não deu para abrir';
let desc = 'O site não respondeu como deveria.';
let tips = ['Confira se o endereço está certo.', 'Tente de novo em alguns instantes.'];

if (code === 'crash') {
  title = 'A aba caiu';
  desc = 'A página travou ou usou memória demais e foi fechada. As outras abas estão bem.';
  tips = ['Clique em tentar de novo para recarregar.', 'Se acontecer sempre neste site, tente desligar o bloqueador nele (escudo na barra).'];
} else if (n === -106) {
  title = 'Sem internet';
  desc = 'O computador não está conectado.';
  tips = ['Confira o Wi-Fi ou o cabo de rede.', 'Reinicie o roteador se as luzes estiverem estranhas.'];
} else if (n === -105 || n === -137) {
  title = 'Esse endereço não existe';
  desc = 'Não foi possível encontrar o servidor desse site.';
  tips = ['Pode ter um erro de digitação no endereço.', 'Se o endereço está certo, a internet pode estar fora.'];
} else if (n === -102) {
  title = 'O site recusou';
  desc = 'O servidor existe, mas recusou a conexão.';
} else if (n === -118 || n === -7) {
  title = 'Demorou demais';
  desc = 'O site levou tempo demais para responder.';
} else if (n === -21) {
  title = 'A rede mudou';
  desc = 'A conexão de internet trocou no meio do carregamento.';
} else if (n <= -200 && n > -300) {
  title = 'Conexão não é segura';
  desc = 'O certificado deste site tem problema. Alguém pode estar tentando interceptar seus dados, ou o site está mal configurado.';
  tips = ['Não digite senhas nem dados de cartão aqui.', 'Se for um site conhecido, confira a data e a hora do computador.'];
} else if (n === -20) {
  title = 'Bloqueado';
  desc = 'O acesso a este endereço foi bloqueado.';
} else if (n === -501 || n === -337) {
  title = 'Endereço inválido';
  desc = 'Esse tipo de endereço não é suportado.';
}

document.title = title;
$('#title').textContent = title;
$('#desc').textContent = desc;
$('#url').textContent = url;
$('#code').textContent = code === 'crash' ? 'ABA CAIU · ' + raw.toUpperCase() : `ERRO ${code}${raw ? ' · ' + raw.replace(/^net::/, '') : ''}`;
$('#tips').innerHTML = tips.map(t => `<li>${esc(t)}</li>`).join('');

$('#retry').addEventListener('click', () => { if (url) location.replace(url); });
$('#search').addEventListener('click', () => {
  const q = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const eng = SETTINGS && SETTINGS.searchEngines && SETTINGS.searchEngines[SETTINGS.searchEngine];
  NQ.open((eng ? eng.url : 'https://www.google.com/search?q=') + encodeURIComponent(q), false);
});
addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#retry').click(); });
