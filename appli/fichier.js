/* Version fichier (file://) : les réglages de la structure sont chargés par des balises <script>, avant app.js.
   En version web, rien : boot.js les lit dans le dossier choisi. */
if(location.protocol==='file:')document.write('<script src="app/logo-association.js"><\/script>\n<script src="app/parametres.js"><\/script>\n<script src="app/donnees.js"><\/script>\n<script src="app/annuaire.js"><\/script>');
