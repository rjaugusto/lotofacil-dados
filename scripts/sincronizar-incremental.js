// Roda automaticamente via GitHub Actions (ver .github/workflows/sincronizar.yml).
// Busca só os concursos novos desde o último salvo em historico.json e atualiza
// o arquivo. Não baixa tudo de novo — só o delta.

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';
const DELAY_MS = 250;
const ARQUIVO = path.join(__dirname, '..', 'historico.json');

function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function converter(raw) {
  return {
    numero: raw.numero,
    dataApuracao: raw.dataApuracao,
    dezenas: (raw.listaDezenas ?? []).map(Number).sort((a, b) => a - b),
    premiacoes: (raw.listaRateioPremio ?? []).map((p) => ({
      descricao: p.descricaoFaixa,
      faixa: p.faixa,
      ganhadores: p.numeroDeGanhadores,
      valorPremio: p.valorPremio,
    })),
    acumulou: raw.acumulado,
    valorAcumuladoProximoConcurso: raw.valorAcumuladoProximoConcurso,
  };
}

async function buscar(url) {
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${url}`);
  return resp.json();
}

async function main() {
  const atual = JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));
  const maiorNumeroSalvo = Math.max(...atual.historico.map((c) => c.numero));

  console.log(`Maior concurso salvo: ${maiorNumeroSalvo}. Buscando último disponível...`);
  const ultimo = await buscar(BASE_URL);
  const numeroFinal = ultimo.numero;

  if (numeroFinal <= maiorNumeroSalvo) {
    console.log('Nada novo para sincronizar.');
    return;
  }

  console.log(`Baixando concursos ${maiorNumeroSalvo + 1} a ${numeroFinal}...`);
  const novos = [];
  for (let numero = maiorNumeroSalvo + 1; numero <= numeroFinal; numero++) {
    const raw = numero === numeroFinal ? ultimo : await buscar(`${BASE_URL}/${numero}`);
    novos.push(converter(raw));
    await dormir(DELAY_MS);
  }

  const historico = [...novos, ...atual.historico].sort((a, b) => b.numero - a.numero);

  fs.writeFileSync(
    ARQUIVO,
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        totalConcursos: historico.length,
        ultimoConcurso: numeroFinal,
        concursosFalhos: atual.concursosFalhos ?? [],
        historico,
      },
      null,
      0,
    ),
  );

  console.log(`Sincronizado. ${novos.length} concurso(s) novo(s) adicionado(s). Total: ${historico.length}.`);
}

main().catch((e) => {
  console.error('Erro na sincronização:', e);
  process.exit(1);
});
