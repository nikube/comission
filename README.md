# Anatole — Simulateur Apport d'Affaires

Simulateur interactif pour le calcul des commissions d'apport d'affaires.

## Tranches de commission

| Tranche CA HT | Taux |
|---|---|
| 0 → 10k€ | 10% |
| 10k → 50k€ | 5% |
| 50k → 100k€ | 2% |
| 100k€+ | 1% |

## Dégressivité par ancienneté client

An 1 ×1 → An 2 ×0.8 → An 3 ×0.6 → An 4 ×0.4 → An 5+ ×0 (client collectif)

## Dev local

```bash
npm install
npm run dev
```

## Deploy sur Coolify

1. Push ce repo sur GitHub/Gitea
2. Coolify → New Resource → ton repo
3. Nixpacks détecte Vite automatiquement
4. **Build command:** `npm run build`
5. **Publish directory:** `dist`
6. Deploy!
