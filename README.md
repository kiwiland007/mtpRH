<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# mtpRH - Gestion des Ressources Humaines

Application de gestion des congés et des ressources humaines conforme au Code du Travail marocain.

## 🚀 Installation

**Prérequis:** Node.js 18+ et un projet Supabase

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration Supabase

Créez un fichier `.env.local` à la racine du projet :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

**Note:** Vous pouvez copier `.env.example` et remplir les valeurs.

### 3. Initialisation de la base de données

1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Allez dans **SQL Editor**
3. Copiez le contenu du fichier `database_schema.sql`
4. Exécutez le script SQL

Ce script va :
- Créer les tables `profiles` et `leave_requests`
- Configurer les politiques de sécurité (RLS)
- Insérer l'utilisateur admin par défaut

### 4. Lancement de l'application

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 📋 Fonctionnalités

- ✅ **Tableau de bord** : Vue d'ensemble des congés et soldes
- ✅ **Demande de congé** : Formulaire de soumission avec calcul automatique
- ✅ **Calendrier d'équipe** : Visualisation des absences
- ✅ **Administration** : Gestion des utilisateurs et validation des demandes
- ✅ **Conformité légale** : Calculs conformes au Code du Travail marocain (Art. 231, 241)

## 🛠️ Technologies

- **React 19** avec TypeScript
- **Supabase** pour la base de données
- **Tailwind CSS** pour le design
- **Recharts** pour les graphiques
- **Vite** comme build tool

## 📝 Notes

- Les congés sont calculés selon l'Art. 231 : 1.5 jours par mois (18 jours/an)
- Majoration d'ancienneté : +1.5 jours tous les 5 ans (Art. 241)
- Plafond légal : 30 jours ouvrables par an maximum
- Les jours fériés marocains sont automatiquement exclus du calcul

## 🔐 Sécurité

⚠️ **Important** : Ne commitez jamais votre fichier `.env.local` contenant vos clés Supabase. Il est déjà dans `.gitignore`.
