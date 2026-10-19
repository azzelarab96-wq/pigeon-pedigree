# Guide de Déploiement : Cloudflare Worker & Import Pédigree Pigeon Pro

Ce guide détaille la mise en place du backend serverless Cloudflare Worker pour contourner les limitations de téléversement (erreurs 502 `ReadableStream uploading is not supported`) sur Firefox (PC) et sur mobile (iOS / Safari, Android), tout en assurant l'extraction exhaustive de toutes les générations d'un pedigree (G0, parents, grands-parents, arrière-grands-parents, détails d'élevage et palmarès).

---

## 1. Pourquoi ce Cloudflare Worker ?

- **Problème 1 résolu (Firefox & Mobile 502) :** Certains navigateurs comme Firefox et Safari mobile envoient les uploads sous forme de streaming ou avec des corps volumineux non supportés par certains proxys hôtes. Le Cloudflare Worker s'exécute directement sur l'infrastructure mondiale de Cloudflare avec en-têtes CORS complets (`Access-Control-Allow-Origin: *`).
- **Problème 2 résolu (Extraction complète au lieu de G0 seul) :** Utilise le schéma JSON complet imposé (couvrant `pigeon`, `parents`, `grands_parents`, `arriere_grands_parents`, `details_elevage`, `resultats_courses`) avec `thinking_budget: 0` pour une réponse ultra-rapide, sans troncature.

---

## 2. Déploiement du Worker sur Cloudflare (Gratuit)

### Méthode A : Déploiement direct en 2 minutes via l'interface web (Sans installer d'outil)

1. Connectez-vous sur [dash.cloudflare.com](https://dash.cloudflare.com/) (compte gratuit).
2. Rendez-vous dans le menu **Workers & Pages** > Cliquez sur **Create Application** (Créer une application) > **Create Worker**.
3. Donnez un nom à votre Worker (ex: `pedigree-extractor-api`) et cliquez sur **Deploy** (Déployer).
4. Cliquez sur **Edit Code** (Modifier le code).
5. Supprimez tout le code existant dans l'éditeur et collez l'intégralité du contenu du fichier `worker.js`.
6. Cliquez sur **Deploy** (Enregistrer et déployer).
7. **Ajout de la clé API Gemini :**
   - Retournez sur la page de votre Worker > onglet **Settings** (Paramètres) > **Variables and Secrets**.
   - Cliquez sur **Add** (Ajouter).
   - Nom de la variable : `GEMINI_API_KEY`
   - Valeur : Collez votre clé API Google Gemini (AI Studio).
   - Cliquez sur **Encrypt / Save** pour sauvegarder le secret.
8. Votre Worker est prêt ! Son adresse publique s'affiche en haut (ex: `https://pedigree-extractor-api.mon-compte.workers.dev`).

---

### Méthode B : Déploiement via le CLI Wrangler (Pour les développeurs)

1. Ouvrez votre terminal et connectez-vous :
   ```bash
   npx wrangler login
   ```
2. Créez votre secret d'API Gemini :
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   # Saisissez votre clé API Gemini lorsqu'invité
   ```
3. Déployez le script :
   ```bash
   npx wrangler deploy worker.js --name pedigree-extractor-api --compatibility-date 2024-04-01
   ```

---

## 3. Configuration dans l'Application

### Dans l'application Pédigree Pigeon Pro (Interface principale) :
1. Ouvrez la boîte de dialogue **« Importer un pedigree (PDF / Photo) »**.
2. Dans le bandeau supérieur ou les paramètres, un champ **« URL du Worker Cloudflare (Optionnel) »** est disponible.
3. Collez l'URL de votre Worker (ex: `https://pedigree-extractor-api.mon-compte.workers.dev`).
4. L'application enregistre cette URL dans votre navigateur (`localStorage`) et redirigera tous les flux de scan directement vers votre Worker sans passer par le proxy hôte. Si aucun Worker n'est spécifié, l'API interne prend le relais automatiquement avec le même algorithme.

### Dans la page dédiée `standalone-import.html` :
- Ouvrez simplement `standalone-import.html` dans votre navigateur.
- Collez votre URL de Worker dans le champ en haut à droite et cliquez sur **« Sauvegarder »**.

---

## 4. Protocole de Test Recommandé

### Test sur Firefox (PC) :
1. Ouvrez Firefox et chargez l'application.
2. Cliquez sur « Importer un pedigree ».
3. Sélectionnez une photo ou un fichier PDF de pedigree colombophile.
4. Constatez :
   - L'absence d'erreur 502 `ReadableStream uploading is not supported`.
   - L'affichage complet de toutes les cases de la génération 0 (sujet) jusqu'aux ancêtres.

### Test sur iPhone / iPad (iOS Safari) :
1. Prenez une photo directe avec l'appareil photo d'un pedigree papier (souvent 12 Mpx / 8 Mo).
2. La compression côté client (`browser-image-compression`) réduit automatiquement l'image à moins de 1 Mo et 1600px max avant l'envoi.
3. L'envoi direct vers le Worker empêche tout crash mémoire WebKit.
4. Pour l'exportation PDF/Image sur mobile :
   - Le bouton **« Partager »** déclenche la feuille de partage native iOS (AirDrop, WhatsApp, Enregistrer dans Fichiers).
   - Le bouton **« Télécharger »** utilise un lien HTTP direct sécurisé pour éviter le blocage de téléchargement dans les iframes.

### Test sur Android (Chrome / Samsung Internet) :
1. Sélectionnez un fichier PDF ou une photo de galerie.
2. L'extraction renvoie l'arbre complet avec les numéros de bagues et les palmarès.
3. Les données sont injectées dans les 31 cases de la maquette officielle A4 Elghali.
