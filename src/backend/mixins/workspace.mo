import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import OQL "mo:caffeineai-oql";
import Entity "mo:caffeineai-oql/Entity";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import IntValue "mo:caffeineai-oql/IntValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import AppsLib "../lib/apps";
import AppTypes "../types/apps";
import SettingsLib "../lib/settings";
import CalculatorLib "../lib/calculator";
import ReportsLib "../lib/reports";
import ReportTypes "../types/reports";

/// OQL entity declarations for the workspace domain: the app registry, the
/// per-user installed apps and home folders, per-user settings, and per-user
/// calculator history. The composition root includes these in the `Expose`
/// mixin so the Data Intelligence agent can query the workspace.
///
/// The registry is global (shared by every user) and read-only, so it is
/// exposed as a public catalogue. Installed apps, folders, settings and
/// calculator history are per-principal: the owner principal is the outer map
/// key, so a scoped caller only ever sees its own rows.
module {
  /// A registry row as exposed to OQL.
  type RegistryRow = {
    id : Nat;
    name : Text;
    icon : Text;
    category : Text;
    description : Text;
    url : Text;
    canisterId : ?Text;
    requiresAuth : Bool;
    launchType : Text;
    version : Text;
  };

  /// An installed-app row as exposed to OQL: the stored app plus its owner.
  type InstalledRow = {
    id : Nat;
    owner : Principal;
    appId : Nat;
    folderId : ?Nat;
    position : Nat;
    favourite : Bool;
    installedAt : Int;
  };

  /// A home-folder row as exposed to OQL: the stored folder plus its owner.
  type FolderRow = {
    id : Nat;
    owner : Principal;
    name : Text;
    position : Nat;
    createdAt : Int;
  };

  /// A settings row as exposed to OQL: the stored settings plus their owner.
  type SettingsRow = {
    owner : Principal;
    theme : Text;
    wallpaper : Text;
    wallpaperEnabled : Bool;
    gridSize : Nat;
    reduceMotion : Bool;
    updatedAt : Int;
  };

  /// A calculator-history row as exposed to OQL: the entry plus its owner.
  type CalcRow = {
    id : Nat;
    owner : Principal;
    expression : Text;
    result : Text;
    createdAt : Int;
  };

  /// A bug-report row as exposed to OQL. Reports are workspace-wide, not
  /// per-principal: the reporter is a column, not the owner.
  type ReportRow = {
    id : Nat;
    reporter : Principal;
    description : Text;
    status : Text;
    category : ?Text;
    summary : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  /// Explicit `_toRow` instances for optional payload columns. OQL 0.7.1 ships
  /// no implicit `?T -> Value` instance, so optional columns must supply one;
  /// `null` maps to the `#null_` scalar.
  func optionalNatToValue(value : ?Nat) : OQL.Value {
    switch (value) {
      case (?n) { #nat n };
      case null { #null_ };
    };
  };

  func optionalTextToValue(value : ?Text) : OQL.Value {
    switch (value) {
      case (?t) { #text t };
      case null { #null_ };
    };
  };

  func categoryText(category : AppTypes.AppCategory) : Text {
    switch (category) {
      case (#ai) { "ai" };
      case (#finance) { "finance" };
      case (#social) { "social" };
      case (#productivity) { "productivity" };
      case (#governance) { "governance" };
      case (#gaming) { "gaming" };
      case (#media) { "media" };
      case (#developer) { "developer" };
      case (#business) { "business" };
      case (#other) { "other" };
    };
  };

  func launchTypeText(launchType : AppTypes.LaunchType) : Text {
    switch (launchType) {
      case (#native) { "native" };
      case (#icpService) { "icpService" };
      case (#externalWeb) { "externalWeb" };
      case (#comingSoon) { "comingSoon" };
    };
  };

  func reportStatusText(status : ReportTypes.ReportStatus) : Text {
    switch (status) {
      case (#open) { "open" };
      case (#inProgress) { "inProgress" };
      case (#resolved) { "resolved" };
      case (#closed) { "closed" };
    };
  };

  func registryRows(states : Map.Map<Principal, AppsLib.State>) : Iter.Iter<RegistryRow> {
    // The registry is identical for every user; take it from the first state
    // that exists, or fall back to a fresh seeded state so the schema is
    // always discoverable.
    let state = switch (states.values().next()) {
      case (?s) { s };
      case null { AppsLib.initState() };
    };
    state.registry.values().map(
      func (entry) {
        {
          id = entry.id;
          name = entry.name;
          icon = entry.icon;
          category = categoryText(entry.category);
          description = entry.description;
          url = entry.url;
          canisterId = entry.canisterId;
          requiresAuth = entry.requiresAuth;
          launchType = launchTypeText(entry.launchType);
          version = entry.version;
        };
      }
    );
  };

  func installedRows(states : Map.Map<Principal, AppsLib.State>) : Iter.Iter<InstalledRow> {
    states.entries().flatMap(
      func ((owner, state)) {
        state.installed.values().map(
          func (app) {
            {
              id = app.id;
              owner;
              appId = app.appId;
              folderId = app.folderId;
              position = app.position;
              favourite = app.favourite;
              installedAt = app.installedAt;
            };
          }
        );
      }
    );
  };

  func folderRows(states : Map.Map<Principal, AppsLib.State>) : Iter.Iter<FolderRow> {
    states.entries().flatMap(
      func ((owner, state)) {
        state.folders.values().map(
          func (folder) {
            {
              id = folder.id;
              owner;
              name = folder.name;
              position = folder.position;
              createdAt = folder.createdAt;
            };
          }
        );
      }
    );
  };

  func settingsRows(states : Map.Map<Principal, SettingsLib.State>) : Iter.Iter<SettingsRow> {
    states.entries().flatMap(
      func ((owner, state)) {
        state.settings.values().map(
          func (settings) {
            {
              owner;
              theme = settings.theme;
              wallpaper = settings.wallpaper;
              wallpaperEnabled = settings.wallpaperEnabled;
              gridSize = settings.gridSize;
              reduceMotion = settings.reduceMotion;
              updatedAt = settings.updatedAt;
            };
          }
        );
      }
    );
  };

  func calcRows(states : Map.Map<Principal, CalculatorLib.State>) : Iter.Iter<CalcRow> {
    states.entries().flatMap(
      func ((owner, state)) {
        state.history.values().map(
          func (entry) {
            {
              id = entry.id;
              owner;
              expression = entry.expression;
              result = entry.result;
              createdAt = entry.createdAt;
            };
          }
        );
      }
    );
  };

  func reportRows(state : ReportsLib.State) : Iter.Iter<ReportRow> {
    state.reports.values().map(
      func (report) {
        {
          id = report.id;
          reporter = report.reporter;
          description = report.description;
          status = reportStatusText(report.status);
          category = report.category;
          summary = report.summary;
          createdAt = report.createdAt;
          updatedAt = report.updatedAt;
        };
      }
    );
  };

  public func entities(
    appStates : Map.Map<Principal, AppsLib.State>,
    settingsStates : Map.Map<Principal, SettingsLib.State>,
    calcStates : Map.Map<Principal, CalculatorLib.State>,
    reportsState : ReportsLib.State,
  ) : [Entity.Decl] {
    [
      OQL.Entity.manual<RegistryRow>("appRegistry", func () = registryRows(appStates), "AppRegistryEntry", "id")
        .sample({
          id = 0;
          name = "";
          icon = "";
          category = "productivity";
          description = "";
          url = "";
          canisterId = ?"";
          requiresAuth = false;
          launchType = "native";
          version = "";
        })
        .payload("id", func r = r.id)
        .payload("name", func r = r.name)
        .payload("icon", func r = r.icon)
        .payload("category", func r = r.category)
        .payload("description", func r = r.description)
        .payload("url", func r = r.url)
        .payload("canisterId", func r = r.canisterId, optionalTextToValue)
        .payload("requiresAuth", func r = r.requiresAuth)
        .payload("launchType", func r = r.launchType)
        .payload("version", func r = r.version)
        .public_()
        .build(),
      OQL.Entity.manual<InstalledRow>("installedApp", func () = installedRows(appStates), "InstalledApp", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          appId = 0;
          folderId = ?0;
          position = 0;
          favourite = false;
          installedAt = 0;
        })
        .payload("id", func r = r.id)
        .payload("owner", func r = r.owner)
        .payload("appId", func r = r.appId)
        .payload("folderId", func r = r.folderId, optionalNatToValue)
        .payload("position", func r = r.position)
        .payload("favourite", func r = r.favourite)
        .payload("installedAt", func r = r.installedAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      OQL.Entity.manual<FolderRow>("homeFolder", func () = folderRows(appStates), "HomeFolder", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          name = "";
          position = 0;
          createdAt = 0;
        })
        .payload("id", func r = r.id)
        .payload("owner", func r = r.owner)
        .payload("name", func r = r.name)
        .payload("position", func r = r.position)
        .payload("createdAt", func r = r.createdAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      OQL.Entity.manual<SettingsRow>("userSettings", func () = settingsRows(settingsStates), "UserSettings", "owner")
        .sample({
          owner = Principal.fromText("aaaaa-aa");
          theme = "";
          wallpaper = "";
          wallpaperEnabled = true;
          gridSize = 0;
          reduceMotion = false;
          updatedAt = 0;
        })
        .payload("owner", func r = r.owner)
        .payload("theme", func r = r.theme)
        .payload("wallpaper", func r = r.wallpaper)
        .payload("wallpaperEnabled", func r = r.wallpaperEnabled)
        .payload("gridSize", func r = r.gridSize)
        .payload("reduceMotion", func r = r.reduceMotion)
        .payload("updatedAt", func r = r.updatedAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      OQL.Entity.manual<CalcRow>("calcEntry", func () = calcRows(calcStates), "CalcEntry", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          expression = "";
          result = "";
          createdAt = 0;
        })
        .payload("id", func r = r.id)
        .payload("owner", func r = r.owner)
        .payload("expression", func r = r.expression)
        .payload("result", func r = r.result)
        .payload("createdAt", func r = r.createdAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      OQL.Entity.manual<ReportRow>("bugReport", func () = reportRows(reportsState), "BugReport", "id")
        .sample({
          id = 0;
          reporter = Principal.fromText("aaaaa-aa");
          description = "";
          status = "open";
          category = ?"";
          summary = ?"";
          createdAt = 0;
          updatedAt = 0;
        })
        .payload("id", func r = r.id)
        .payload("reporter", func r = r.reporter)
        .payload("description", func r = r.description)
        .payload("status", func r = r.status)
        .payload("category", func r = r.category, optionalTextToValue)
        .payload("summary", func r = r.summary, optionalTextToValue)
        .payload("createdAt", func r = r.createdAt)
        .payload("updatedAt", func r = r.updatedAt)
        .controllerOnly()
        .build(),
    ];
  };
};
