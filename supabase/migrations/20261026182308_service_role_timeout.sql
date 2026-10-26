-- L'import Awin (rôle service_role) réécrit des milliers d'offres : le délai par défaut
-- coupe les écritures quand le disque de l'offre gratuite est ralenti.
ALTER ROLE service_role SET statement_timeout = '180s';
NOTIFY pgrst, 'reload config';
