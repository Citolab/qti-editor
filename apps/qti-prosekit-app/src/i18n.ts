import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { registerQtiMessages } from '@citolab/prose-qti/components/shared';

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
      fileImport: 'Import',
      fileImportQti: 'Import QTI XML',
      fileImportQtiTitle: 'Import QTI XML file',
      fileImportJson: 'Import JSON',
      fileImportJsonTitle: 'Import ProseMirror JSON document',
      fileImportRoundtrip: 'Import XML',
      fileImportRoundtripTitle: 'Import lossless XML (dev)',
      fileExport: 'Export',
      fileExportQtiItem: 'Export QTI3 item',
      fileExportQtiItemTitle: 'Export single QTI3 item',
      fileExportJson: 'Export JSON',
      fileExportJsonTitle: 'Export ProseMirror JSON document',
      fileExportRoundtrip: 'Export XML',
      fileExportRoundtripTitle: 'Export lossless XML (dev)',
      fileExportQtiTest: 'Export QTI3 test',
      fileExportQtiTestTitle: 'Export multiple QTI3 items',
      devMode: 'Dev mode',
      devModeTitle: 'Toggle developer-only import/export options',
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
      compatibilityRemoved_one: '1 piece of content was removed while opening this document — it is not part of the current format.',
      compatibilityRemoved_other: '{{count}} pieces of content were removed while opening this document — they are not part of the current format.',
      compatibilityKeptRest: 'Everything else was kept, and the original was saved aside.',
      compatibilityShowDetails: 'Show details',
      compatibilityHideDetails: 'Hide details',
      compatibilityDismiss: 'Dismiss',
      compatibilityDownloadOriginal: 'Download original',
      compatibilityGoTo: 'Show me',
      compatibilityGroupContent: 'Content that could not be kept',
      compatibilityGroupFormatting: 'Formatting that could not be kept',
      compatibilityGroupSettings: 'Settings that changed',
      compatibilityGroupOther: 'Other changes',
      compatibilityContentRemoved: 'A {{name}} was removed',
      compatibilityFormattingRemoved: '{{name}} formatting was removed; the text it covered was kept',
      compatibilitySettingRemoved: '“{{attribute}}” on the {{name}} is no longer part of the format',
      compatibilitySettingReset: '“{{attribute}}” on the {{name}} was reset to its default',
      compatibilitySettingRejectedValue: 'the saved value was {{value}}',
      compatibilitySettingChangedHere: 'A setting was changed here: {{attribute}}',
      compatibilityKeptChildren_one: '1 block inside it was kept',
      compatibilityKeptChildren_other: '{{count}} blocks inside it were kept',
      compatibilityKeptNothing: 'nothing was left in its place',
      compatibilityUnnamedContent: 'content',
      /*
       * Names for node and mark types, asked for as `compatibilityTypeLabel.<type>`.
       *
       * Empty on purpose. `describe.ts` falls back to deriving a name from the type itself
       * (`qtiGapMatchInteraction` -> "gap match interaction"), which is right for the long tail —
       * these are the types the schema no longer has, so no list can be complete. Entries here are
       * for the ones worth saying differently, and the same key is what an embedder overrides at
       * runtime via `i18n.addResourceBundle`.
       */
      compatibilityTypeLabel: {},
      compatibilityCouldNotOpen: '“{{name}}” could not be opened.',
      compatibilityFileUntouched: 'The file has been left exactly as it was, so nothing is lost.',
      compatibilityFileUnreadable: 'It is stored in a format this editor cannot read.',
      compatibilityFileUnreadableAtVersion: 'It was saved in format version {{version}}, which this editor cannot read.',
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
      fileImport: 'Importeren',
      fileImportQti: 'QTI3 XML importeren',
      fileImportQtiTitle: 'QTI3 XML-bestand importeren',
      fileImportJson: 'JSON importeren',
      fileImportJsonTitle: 'ProseMirror JSON-document importeren',
      fileImportRoundtrip: 'XML importeren',
      fileImportRoundtripTitle: 'Lossless XML importeren (dev)',
      fileExport: 'Exporteren',
      fileExportQtiItem: 'QTI3 Item exporteren',
      fileExportQtiItemTitle: 'QTI3 XML export van één assessment item',
      fileExportJson: 'JSON exporteren',
      fileExportJsonTitle: 'ProseMirror JSON-document exporteren',
      fileExportRoundtrip: 'XML exporteren',
      fileExportRoundtripTitle: 'Lossless XML exporteren (dev)',
      fileExportQtiTest: 'QTI3 Toets exporteren',
      fileExportQtiTestTitle: 'QTI3 XML export van meerdere assessment items',
      devMode: 'Dev-modus',
      devModeTitle: 'Schakel ontwikkelaar-import/export opties in',
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
      compatibilityRemoved_one: 'Er is 1 stuk inhoud verwijderd bij het openen van dit document — het hoort niet bij het huidige formaat.',
      compatibilityRemoved_other: 'Er zijn {{count}} stukken inhoud verwijderd bij het openen van dit document — ze horen niet bij het huidige formaat.',
      compatibilityKeptRest: 'De rest is behouden en het origineel is apart bewaard.',
      compatibilityShowDetails: 'Details tonen',
      compatibilityHideDetails: 'Details verbergen',
      compatibilityDismiss: 'Sluiten',
      compatibilityDownloadOriginal: 'Origineel downloaden',
      compatibilityGoTo: 'Laat zien',
      compatibilityGroupContent: 'Inhoud die niet behouden kon worden',
      compatibilityGroupFormatting: 'Opmaak die niet behouden kon worden',
      compatibilityGroupSettings: 'Gewijzigde instellingen',
      compatibilityGroupOther: 'Overige wijzigingen',
      compatibilityContentRemoved: 'Een {{name}} is verwijderd',
      compatibilityFormattingRemoved: 'Opmaak {{name}} is verwijderd; de tekst eronder is behouden',
      compatibilitySettingRemoved: '“{{attribute}}” op de {{name}} hoort niet meer bij het formaat',
      compatibilitySettingReset: '“{{attribute}}” op de {{name}} is terugezet naar de standaardwaarde',
      compatibilitySettingRejectedValue: 'de opgeslagen waarde was {{value}}',
      compatibilitySettingChangedHere: 'Hier is een instelling gewijzigd: {{attribute}}',
      compatibilityKeptChildren_one: '1 blok erbinnen is behouden',
      compatibilityKeptChildren_other: '{{count}} blokken erbinnen zijn behouden',
      compatibilityKeptNothing: 'er bleef niets op die plek over',
      compatibilityUnnamedContent: 'inhoud',
      // See the English side: derived from the type name unless an entry says otherwise.
      compatibilityTypeLabel: {},
      compatibilityCouldNotOpen: '“{{name}}” kon niet worden geopend.',
      compatibilityFileUntouched: 'Het bestand is precies zo gelaten als het was, dus er gaat niets verloren.',
      compatibilityFileUnreadable: 'Het is opgeslagen in een formaat dat deze editor niet kan lezen.',
      compatibilityFileUnreadableAtVersion: 'Het is opgeslagen in formaatversie {{version}}, die deze editor niet kan lezen.',
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

/*
 * The editor's Lit components translate through `translateQti`, which reads a registry separate from
 * this i18next instance — i18next covers the React app chrome, `translateQti` covers everything
 * inside the editor.
 *
 * `qtiItemDivider` is this app's own node, so its label is this app's to supply. Registering it here
 * rather than adding it to `@citolab/prose-qti`'s catalogue keeps the ownership matching: the
 * package should not carry strings for nodes it does not define.
 *
 * It also replaces a hardcoded 'Item-scheiding' in the slash menu, which showed Dutch to an English
 * user because it never went through the registry at all.
 */
registerQtiMessages('en', { 'interactionInsert.itemDivider': 'Item Separator' });
registerQtiMessages('nl', { 'interactionInsert.itemDivider': 'Item-scheiding' });

export { i18n };
