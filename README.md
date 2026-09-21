# clarina

PWA Vue 3 pour s’exercer à la clarinette (accordeur + lecture de notes).

## Démarrage

```bash
npm install
npm run dev
```

Build production : `npm run build` puis `npm run preview`.

Nécessite HTTPS (ou localhost) pour l’accès micro, et un écran en mode paysage.

## Déploiement

Chaque poussée sur `master` (ou un lancement manuel du workflow) construit l’app
puis synchronise `dist/` vers le VPS.

Secrets GitHub à créer (`Settings → Secrets and variables → Actions`) :

| Secret | Rôle |
| --- | --- |
| `VPS_HOST` | Hôte SSH |
| `VPS_USER` | Utilisateur SSH |
| `VPS_SSH_PRIVATE_KEY` | Clé privée SSH (ed25519) |
| `VPS_PATH` | Racine web distante (ex. `/var/www/clarina`) |
| `VPS_PORT` | Optionnel, port SSH (défaut `22`) |
| `DEPLOY_URL` | Optionnel, URL HTTPS de contrôle après déploiement |

Côté VPS : créer le dossier, installer le vhost (`deploy/nginx.conf`) et un
certificat TLS (Certbot). Autoriser la clé publique correspondant à
`VPS_SSH_PRIVATE_KEY` dans `~/.ssh/authorized_keys`.
