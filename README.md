# lotofacil-dados

Histórico completo de resultados da Lotofácil em JSON, atualizado automaticamente
todo dia via GitHub Actions. Usado pelo app **Gerador de Lotofácil** para não
precisar bater repetidamente na API pública da Caixa.

## Arquivo

`historico.json` — objeto com:

```json
{
  "geradoEm": "ISO date da última atualização",
  "totalConcursos": 3769,
  "ultimoConcurso": 3769,
  "concursosFalhos": [],
  "historico": [
    { "numero": 3769, "dataApuracao": "...", "dezenas": [1, 2, ...], "premiacoes": [...], "acumulou": false }
  ]
}
```

Ordenado do concurso mais recente para o mais antigo.

## URL pública (raw)

```
https://raw.githubusercontent.com/rjaugusto/lotofacil-dados/main/historico.json
```

## Sincronização

Um workflow do GitHub Actions (`.github/workflows/sincronizar.yml`) roda todo dia
às 12h UTC, busca só os concursos novos desde o último salvo e faz commit/push
automaticamente. Não precisa rodar nada manualmente.

Para forçar uma sincronização manual: aba **Actions** deste repositório →
"Sincronizar histórico da Lotofácil" → **Run workflow**.

## Carga inicial

`scripts/baixar-historico-completo.js` (rodado uma única vez, localmente) baixou
todos os concursos de 1 até o mais recente da época.
