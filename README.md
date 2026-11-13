# Mountain 3D

Application web qui transforme une zone de montagne en terrain 3D interactif : modèle numérique de terrain,
orthophoto, sommets (OpenStreetMap) et profil de la randonnée.

## Le parcours utilisateur

1. **Charge un fichier GPX** — le tracé de la randonnée s'affiche sur la carte et la vue se cale automatiquement dessus.
2. **Cadre la zone** — déplace et zoome la carte pour encadrer le parcours dans le viseur.
3. **Clique sur « Générer la 3D »** — et c'est parti : le parcours s'élève en 3D sur le relief réel de la zone,
   avec l'orthophoto plaquée sur le terrain, les sommets alentour et les statistiques du tracé (distance, dénivelé).
4. **Explore** — orbite autour du terrain, ajuste l'exagération verticale, puis reviens à la carte pour changer de zone.

## Stack

**Frontend**
- React 19 + TypeScript
- Vite
- Three.js / React Three Fiber + Drei
- Leaflet / React Leaflet (sélection de zone et import GPX)
- Oxlint

**Backend**
- Python + FastAPI
- NumPy, PyProj
- Données IGN (WMS) pour le relief et l'orthophoto
- API Overpass (OpenStreetMap) pour les sommets
- uv pour la gestion des dépendances

## Démarrage

### Backend

```bash
cd backend
uv run fastapi dev
```

API disponible sur `http://localhost:8000` (documentation sur `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Application disponible sur `http://localhost:5173`.

## Commandes utiles

| Dossier    | Commande          | Description                        |
| ---------- | ----------------- | ---------------------------------- |
| `frontend` | `npm run dev`     | Serveur de développement Vite      |
| `frontend` | `npm run build`   | Build de production                |
| `frontend` | `npm run preview` | Prévisualisation du build          |
| `frontend` | `npm run lint`    | Lint avec Oxlint                   |
| `backend`  | `uv run fastapi dev` | Serveur API avec rechargement |

## API

- `GET /` : test de disponibilité
- `POST /terrain` : génère le terrain à partir d'une bounding box (et optionnellement d'un tracé GPX)
