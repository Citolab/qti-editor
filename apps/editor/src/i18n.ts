import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const LANGUAGE_STORAGE_KEY = 'qti-editor:app-language';

const resources = {
  en: {
    translation: {
      appTitle: 'QTI Editor',
      language: 'Language',
      languageEnglish: 'English',
      languageDutch: 'Dutch',
      confirmDeleteFile: 'Delete this file?',
      untitled: 'Untitled',
      item: 'item',
      autosaveSaving: 'Saving…',
      autosaveSaved: 'Auto-saved',
      fileNew: 'New',
      fileNewTitle: 'New file',
      fileSave: 'Save',
      fileSaveDirty: 'Save *',
      fileSaveTitle: 'Save (Ctrl+S)',
      fileImport: 'Import QTI',
      fileImportTitle: 'Import QTI XML file',
      fileExport: 'Export QTI',
      fileExportTitle: 'Export as QTI XML',
      fileLoad: 'Load',
      fileLoadTitle: 'Open a saved file',
      fileNoSaved: 'No saved files yet',
      fileDelete: 'Delete',
      fileRename: 'Rename',
      fileUnsavedChanges: 'Unsaved changes',
      unsavedDialogTitle: 'Unsaved changes',
      unsavedDialogBody: 'Do you want to save your changes before continuing?',
      cancel: 'Cancel',
      discard: 'Discard',
      save: 'Save',
      authSignIn: 'Sign in',
      authSignOut: 'Sign out',
      authCreateAccount: 'Create account',
      authCreateAccountAction: 'Create an account',
      authAlreadyHaveAccount: 'Already have an account?',
      authEmail: 'Email',
      authPassword: 'Password',
      authFailed: 'Authentication failed',
      statusNotSynced: 'Not synced',
      statusSyncing: 'Syncing…',
      statusSynced: 'Synced',
      statusSyncError: 'Sync error',
      statusSignedInAs: 'Signed in as {{email}}',
      statusLocalOnly: 'Local only — sync unavailable.',
      statusEnableSyncPrefix: '',
      statusEnableSyncAction: 'Sign in or create an account',
      statusEnableSyncSuffix: 'to enable cross-device sync.',
      statusAtTime: 'at {{time}}',
    },
  },
  nl: {
    translation: {
      appTitle: 'QTI-editor',
      language: 'Taal',
      languageEnglish: 'Engels',
      languageDutch: 'Nederlands',
      confirmDeleteFile: 'Dit bestand verwijderen?',
      untitled: 'Zonder titel',
      item: 'item',
      autosaveSaving: 'Opslaan…',
      autosaveSaved: 'Automatisch opgeslagen',
      fileNew: 'Nieuw',
      fileNewTitle: 'Nieuw bestand',
      fileSave: 'Opslaan',
      fileSaveDirty: 'Opslaan *',
      fileSaveTitle: 'Opslaan (Ctrl+S)',
      fileImport: 'QTI importeren',
      fileImportTitle: 'QTI XML-bestand importeren',
      fileExport: 'QTI exporteren',
      fileExportTitle: 'Exporteren als QTI XML',
      fileLoad: 'Openen',
      fileLoadTitle: 'Een opgeslagen bestand openen',
      fileNoSaved: 'Nog geen opgeslagen bestanden',
      fileDelete: 'Verwijderen',
      fileRename: 'Hernoemen',
      fileUnsavedChanges: 'Niet-opgeslagen wijzigingen',
      unsavedDialogTitle: 'Niet-opgeslagen wijzigingen',
      unsavedDialogBody: 'Wil je je wijzigingen opslaan voordat je doorgaat?',
      cancel: 'Annuleren',
      discard: 'Negeren',
      save: 'Opslaan',
      authSignIn: 'Inloggen',
      authSignOut: 'Uitloggen',
      authCreateAccount: 'Account aanmaken',
      authCreateAccountAction: 'Een account aanmaken',
      authAlreadyHaveAccount: 'Heb je al een account?',
      authEmail: 'E-mailadres',
      authPassword: 'Wachtwoord',
      authFailed: 'Authenticatie mislukt',
      statusNotSynced: 'Niet gesynchroniseerd',
      statusSyncing: 'Synchroniseren…',
      statusSynced: 'Gesynchroniseerd',
      statusSyncError: 'Synchronisatiefout',
      statusSignedInAs: 'Ingelogd als {{email}}',
      statusLocalOnly: 'Alleen lokaal — synchronisatie niet beschikbaar.',
      statusEnableSyncPrefix: '',
      statusEnableSyncAction: 'Log in of maak een account aan',
      statusEnableSyncSuffix: 'om synchronisatie tussen apparaten in te schakelen.',
      statusAtTime: 'om {{time}}',
    },
  },
} as const;

function getInitialLanguage(): keyof typeof resources {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'en' || stored === 'nl') return stored;

  const browser = window.navigator.language.toLowerCase().split('-')[0];
  return browser === 'en' ? 'en' : 'nl';
}

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', language => {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
});

export { i18n };
