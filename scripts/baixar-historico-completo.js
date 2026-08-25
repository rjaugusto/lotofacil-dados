// Script único (rodar manualmente, uma vez): baixa TODOS os concursos já
// sorteados da Lotofácil na API pública da Caixa e salva em historico.json.
// Depois disso, a sincronização do dia a dia é feita por
// scripts/sincronizar-incremental.js (via GitHub Actions).
//
// Uso: node scripts/baixar-historico-completo.js

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';
const DELAY_MS = 250; // educado com a API pública, evita rajada de requisições
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
  console.log('Buscando último concurso...');
  const ultimo = await buscar(BASE_URL);
  const numeroFinal = ultimo.numero;
  console.log(`Último concurso: ${numeroFinal}. Baixando 1 a ${numeroFinal}...`);

  const historico = [];
  const falhas = [];
  const inicio = Date.now();

  for (let numero = 1; numero <= numeroFinal; numero++) {
    try {
      const raw = numero === numeroFinal ? ultimo : await buscar(`${BASE_URL}/${numero}`);
      historico.push(converter(raw));
    } catch (e) {
      falhas.push(numero);
      console.warn(`Falhou concurso ${numero}: ${e.message}`);
    }

    if (numero % 100 === 0 || numero === numeroFinal) {
      const decorridoMin = ((Date.now() - inicio) / 60000).toFixed(1);
      console.log(`${numero}/${numeroFinal} (${decorridoMin} min decorridos)`);
    }

    await dormir(DELAY_MS);
  }

  historico.sort((a, b) => b.numero - a.numero);

  fs.writeFileSync(
    ARQUIVO,
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        totalConcursos: historico.length,
        ultimoConcurso: numeroFinal,
        concursosFalhos: falhas,
        historico,
      },
      null,
      0,
    ),
  );

  console.log(`\nPronto. ${historico.length} concursos salvos em ${ARQUIVO}.`);
  if (falhas.length > 0) {
    console.log(`Falharam ${falhas.length} concursos: ${falhas.join(', ')}`);
  }
}

main().catch((e) => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
