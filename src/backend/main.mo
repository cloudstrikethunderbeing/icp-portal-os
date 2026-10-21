import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Expose "mo:caffeineai-oql/Expose";

import FilesLib "lib/files";
import NotesLib "lib/notes";
import AppsLib "lib/apps";
import SettingsLib "lib/settings";
import CalculatorLib "lib/calculator";
import ReportsLib "lib/reports";

import FilesApi "mixins/files-api";
import NotesApi "mixins/notes-api";
import AppsApi "mixins/apps-api";
import SettingsApi "mixins/settings-api";
import CalculatorApi "mixins/calculator-api";
import ReportsApi "mixins/reports-api";
import Directory "mixins/directory";
import FilesEntities "mixins/files";
import NotesEntities "mixins/notes";
import WorkspaceEntities "mixins/workspace";
import ApiDoc "mixins/api-doc";

actor {
  // Shared authorization state (platform role management).
  let accessControlState : AccessControl.AccessControlState;

  // Per-principal workspace state. Each map is keyed by the caller principal,
  // so a caller only ever reads or writes its own records.
  let filesStates : Map.Map<Principal, FilesLib.State>;
  let notesStates : Map.Map<Principal, NotesLib.State>;
  let appsStates : Map.Map<Principal, AppsLib.State>;
  let settingsStates : Map.Map<Principal, SettingsLib.State>;
  let calcStates : Map.Map<Principal, CalculatorLib.State>;

  // Workspace-wide bug-report inbox. Reports are not per-principal: every
  // signed-in user submits into the same store, and only the workspace admin
  // reads it. The reporting principal is captured on each record.
  let reportsState : ReportsLib.State;

  include MixinAuthorization(accessControlState, null);
  include MixinObjectStorage();

  include FilesApi(accessControlState, filesStates);
  include NotesApi(accessControlState, notesStates);
  include AppsApi(accessControlState, appsStates);
  include SettingsApi(accessControlState, settingsStates);
  include CalculatorApi(accessControlState, calcStates);
  include ReportsApi(accessControlState, reportsState);
  include Directory(accessControlState, appsStates);

  include ApiDoc();

  include Expose({
    entities = FilesEntities.entities(filesStates)
      .concat(NotesEntities.entities(notesStates))
      .concat(WorkspaceEntities.entities(appsStates, settingsStates, calcStates, reportsState));
  });
};
