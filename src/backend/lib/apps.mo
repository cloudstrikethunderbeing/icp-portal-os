import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types/apps";

module {
  public type AppRegistryEntry = Types.AppRegistryEntry;
  public type Shortcut = Types.Shortcut;
  public type InstalledApp = Types.InstalledApp;
  public type HomeFolder = Types.HomeFolder;
  public type Dock = Types.Dock;
  public type HomeItem = Types.HomeItem;
  public type WorkspaceError = Types.WorkspaceError;

  /// Per-principal home-screen and registry state.
  public type State = {
    registry : Map.Map<Nat, AppRegistryEntry>;
    shortcuts : Map.Map<Nat, Shortcut>;
    installed : Map.Map<Nat, InstalledApp>;
    folders : Map.Map<Nat, HomeFolder>;
    var dock : Dock;
    var nextRegistryId : Nat;
    var nextShortcutId : Nat;
    var nextInstalledId : Nat;
    var nextFolderId : Nat;
  };

  /// Validate a shortcut or website-link address before it is stored. Returns
  /// `null` when the address is usable, or a clear, user-facing message when it
  /// is not. Only absolute `http://` and `https://` addresses with a non-empty
  /// host are accepted; anything else (empty, a bare word, a relative path, a
  /// non-web scheme) is rejected.
  public func validateUrl(url : Text) : ?Text {
    let trimmed = url.trim(#predicate(func (c) = c == ' ' or c == '\t' or c == '\n' or c == '\r'));
    if (trimmed.size() == 0) {
      return ?"Enter a web address, for example https://example.com";
    };
    let lower = trimmed.toLower();
    let rest = switch (lower.stripStart(#text "https://")) {
      case (?after) { ?after };
      case null {
        switch (lower.stripStart(#text "http://")) {
          case (?after) { ?after };
          case null { null };
        };
      };
    };
    switch (rest) {
      case null {
        ?"Address must start with http:// or https://";
      };
      case (?hostAndPath) {
        // The host is everything up to the first '/', '?' or '#'.
        let host = hostAndPath.split(#predicate(func (c) = c == '/' or c == '?' or c == '#')).next();
        switch (host) {
          case null { ?"Address is missing a website name" };
          case (?h) {
            if (h.size() == 0) {
              ?"Address is missing a website name";
            } else if (h.contains(#char ' ')) {
              ?"Address cannot contain spaces";
            } else {
              null;
            };
          };
        };
      };
    };
  };

  /// Trap with a clear message when `url` is not a usable web address. Used by
  /// the shortcut mutations so an invalid address is never stored.
  public func requireValidUrl(url : Text) {
    switch (validateUrl(url)) {
      case null {};
      case (?message) { Runtime.trap(message) };
    };
  };

  /// The curated ICP ecosystem catalogue. Ids 0-4 are the working native apps
  /// installed on a fresh home screen; ids 5+ are the browsable directory.
  /// Every entry carries an accurate name, description, category, url and icon
  /// key. `#comingSoon` entries can never launch.
  func catalogue() : [AppRegistryEntry] {
    [
      // --- Native apps (installed by default) ---
      {
        id = 0;
        name = "Files";
        icon = "folder";
        category = #productivity;
        description = "Browse, upload and organise your files and folders.";
        url = "";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #native;
      },
      {
        id = 1;
        name = "Notes";
        icon = "note";
        category = #productivity;
        description = "Write and organise notes with folders and attachments.";
        url = "";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #native;
      },
      {
        id = 2;
        name = "Calculator";
        icon = "calculator";
        category = #productivity;
        description = "A fast calculator with a saved history.";
        url = "";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #native;
      },
      {
        id = 3;
        name = "App Directory";
        icon = "grid";
        category = #developer;
        description = "Browse the curated ICP ecosystem catalogue.";
        url = "";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #native;
      },
      {
        id = 4;
        name = "Settings";
        icon = "settings";
        category = #productivity;
        description = "Theme, wallpaper, grid size and motion preferences.";
        url = "";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #native;
      },
      // --- Explore ICP group ---
      {
        id = 5;
        name = "DFINITY";
        icon = "dfinity";
        category = #developer;
        description = "The DFINITY Foundation, the team behind the Internet Computer.";
        url = "https://dfinity.org";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 6;
        name = "Internet Computer";
        icon = "icp";
        category = #developer;
        description = "The official Internet Computer Protocol website.";
        url = "https://internetcomputer.org";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 7;
        name = "OpenCloud";
        icon = "cloud";
        category = #developer;
        description = "OpenCloud — open cloud infrastructure for the Internet Computer.";
        url = "https://opencloud.org";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 8;
        name = "ICP Skills";
        icon = "skills";
        category = #developer;
        description = "Learn to build on the Internet Computer with ICP Skills.";
        url = "https://skills.internetcomputer.org";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      // --- Wallets ---
      {
        id = 9;
        name = "NNS Dapp";
        icon = "nns";
        category = #governance;
        description = "The Network Nervous System: stake ICP, vote on proposals and manage neurons.";
        url = "https://nns.ic0.app";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 10;
        name = "Internet Identity";
        icon = "identity";
        category = #governance;
        description = "Manage the Internet Identity anchors used to sign in to ICP apps.";
        url = "https://id.ai";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 11;
        name = "Plug Wallet";
        icon = "wallet";
        category = #finance;
        description = "A browser wallet for ICP tokens and Internet Computer assets.";
        url = "https://plugwallet.ooo";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      // --- Explorers ---
      {
        id = 12;
        name = "ICP Dashboard";
        icon = "explorer";
        category = #developer;
        description = "The official Internet Computer dashboard: canisters, subnets, nodes and metrics.";
        url = "https://dashboard.internetcomputer.org";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 13;
        name = "IC Explorer";
        icon = "explorer";
        category = #developer;
        description = "Explore Internet Computer canisters, transactions and blocks.";
        url = "https://www.icexplorer.io/";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      // --- Developer tools ---
      {
        id = 14;
        name = "Caffeine";
        icon = "caffeine";
        category = #developer;
        description = "Build and deploy full-stack apps on the Internet Computer with AI.";
        url = "https://caffeine.ai";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 15;
        name = "MULTI/DEX";
        icon = "multidex";
        category = #finance;
        description = "A multi-chain decentralised exchange built on the Internet Computer.";
        url = "https://multidex.ai";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 16;
        name = "ICP Ninja";
        icon = "ninja";
        category = #developer;
        description = "Write, compile and deploy Motoko and Rust canisters in the browser.";
        url = "https://icp.ninja";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 17;
        name = "Motoko Playground";
        icon = "code";
        category = #developer;
        description = "An online IDE for writing and testing Motoko canisters.";
        url = "https://m7sm4-2iaaa-aaaab-qabra-cai.raw.ic0.app";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      // --- Community apps ---
      {
        id = 18;
        name = "OpenChat";
        icon = "chat";
        category = #social;
        description = "A decentralised, end-to-end encrypted chat app running on the Internet Computer.";
        url = "https://oc.app";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #comingSoon;
      },
      {
        id = 19;
        name = "DSCVR";
        icon = "social";
        category = #social;
        description = "A social news and community platform built on the Internet Computer.";
        url = "https://dscvr.one";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 20;
        name = "Distrikt";
        icon = "social";
        category = #social;
        description = "A decentralised professional social network on the Internet Computer.";
        url = "https://distrikt.app";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 21;
        name = "Kinic";
        icon = "search";
        category = #developer;
        description = "A search engine and content discovery platform for the Internet Computer.";
        url = "https://kinic.io";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 22;
        name = "ICPSwap";
        icon = "swap";
        category = #finance;
        description = "A decentralised exchange and AMM for ICRC tokens on the Internet Computer.";
        url = "https://icpswap.com";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 23;
        name = "Sonic";
        icon = "swap";
        category = #finance;
        description = "An AMM and DeFi platform for swapping and providing liquidity on ICP.";
        url = "https://sonic.ooo";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 24;
        name = "OpenFPL";
        icon = "sports";
        category = #gaming;
        description = "A decentralised fantasy football game built on the Internet Computer.";
        url = "https://openfpl.xyz";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 25;
        name = "IC Ghost";
        icon = "game";
        category = #gaming;
        description = "A fully on-chain arcade game running on the Internet Computer.";
        url = "https://icghost.com";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 26;
        name = "Nuance";
        icon = "note";
        category = #media;
        description = "A decentralised publishing platform for writers on the Internet Computer.";
        url = "https://nuance.xyz";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 27;
        name = "Yuku";
        icon = "media";
        category = #media;
        description = "A decentralised NFT marketplace and creator platform on ICP.";
        url = "https://yuku.app";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 28;
        name = "ICPSwap Analytics";
        icon = "chart";
        category = #finance;
        description = "Analytics and market data for tokens traded on the Internet Computer.";
        url = "https://info.icpswap.com";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 29;
        name = "ICP Hub";
        icon = "community";
        category = #other;
        description = "A community hub for Internet Computer news, events and resources.";
        url = "https://icphub.org";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 30;
        name = "IC Wallet";
        icon = "wallet";
        category = #finance;
        description = "A community wallet for managing ICP and ICRC tokens.";
        url = "";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "0.1.0";
        launchType = #comingSoon;
      },
      // --- Additional verified ICP ecosystem apps ---
      {
        id = 31;
        name = "OISY";
        icon = "wallet";
        category = #finance;
        description = "A fully on-chain, multi-network wallet for ICP and other assets.";
        url = "https://oisy.com";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #icpService;
      },
      {
        id = 32;
        name = "CycleOps";
        icon = "chart";
        category = #developer;
        description = "Monitor and manage ICP canisters with automated cycle top-ups and alerts.";
        url = "https://cycleops.dev";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 33;
        name = "ICP Explorer";
        icon = "explorer";
        category = #developer;
        description = "Explore Internet Computer blocks, transactions and network statistics.";
        url = "https://icpexplorer.org";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      {
        id = 34;
        name = "ICSCAN";
        icon = "explorer";
        category = #developer;
        description = "A block explorer for Internet Computer subnets, nodes, accounts and neurons.";
        url = "https://icscan.io";
        canisterId = null;
        requiresAuth = false;
        permissions = [];
        version = "1.0.0";
        launchType = #externalWeb;
      },
      // --- Native workspace apps ---
      {
        id = 35;
        name = "AI Agent";
        icon = "ai";
        category = #ai;
        description = "Ask questions about your workspace.";
        url = "";
        canisterId = null;
        requiresAuth = true;
        permissions = [];
        version = "1.0.0";
        launchType = #native;
      },
    ];
  };

  /// The curated ICP ecosystem catalogue. Every user's registry is seeded with
  /// the same entries; installing one copies it onto the home screen. Launch
  /// targets are real URLs or native modules — nothing here pretends to work
  /// when it does not.
  func seedRegistry() : Map.Map<Nat, AppRegistryEntry> {
    let registry = Map.empty<Nat, AppRegistryEntry>();
    for (entry in catalogue().values()) {
      registry.add(entry.id, entry);
    };
    registry;
  };

  /// The apps installed on a fresh home screen: the five working native apps.
  func seedInstalled() : Map.Map<Nat, InstalledApp> {
    let installed = Map.empty<Nat, InstalledApp>();
    let now = Time.now();
    let nativeIds = [0, 1, 2, 3, 4];
    var position = 0;
    for (appId in nativeIds.values()) {
      installed.add(
        position,
        {
          id = position;
          appId;
          folderId = null;
          position;
          favourite = false;
          installedAt = now;
        },
      );
      position += 1;
    };
    installed;
  };

  public func initState() : State {
    let shortcuts = Map.empty<Nat, Shortcut>();
    let folders = Map.empty<Nat, HomeFolder>();
    // Seed a real, editable "Explore ICP" folder holding shortcuts to the
    // core Internet Computer resources. The user can rename the folder, edit
    // or remove its shortcuts, and move apps in or out like any other folder.
    let now = Time.now();
    let exploreFolder : HomeFolder = {
      id = 0;
      name = "Explore ICP";
      position = 0;
      createdAt = now;
    };
    folders.add(exploreFolder.id, exploreFolder);
    let exploreLinks : [(Text, Text, Text)] = [
      ("DFINITY", "https://dfinity.org", "dfinity"),
      ("Internet Computer", "https://internetcomputer.org", "icp"),
      ("OpenCloud", "https://opencloud.org", "cloud"),
      ("ICP Skills", "https://skills.internetcomputer.org", "skills"),
    ];
    var shortcutId = 0;
    for ((name, url, icon) in exploreLinks.values()) {
      shortcuts.add(
        shortcutId,
        {
          id = shortcutId;
          name;
          url;
          icon;
          launchType = #externalWeb;
          position = shortcutId;
          folderId = ?exploreFolder.id;
          favourite = false;
          createdAt = now;
        },
      );
      shortcutId += 1;
    };
    {
      registry = seedRegistry();
      shortcuts;
      installed = seedInstalled();
      folders;
      var dock = { appIds = [0, 1, 2, 4] };
      var nextRegistryId = 100;
      var nextShortcutId = shortcutId;
      var nextInstalledId = 5;
      var nextFolderId = 1;
    };
  };

  public func listRegistry(state : State) : [AppRegistryEntry] {
    state.registry.values().toArray();
  };

  public func getRegistryEntry(state : State, id : Nat) : ?AppRegistryEntry {
    state.registry.get(id);
  };

  /// Install a registered app onto the caller's home screen. Returns the new
  /// installed app, or `null` when the app is not registered or already
  /// installed.
  public func installApp(state : State, appId : Nat) : ?InstalledApp {
    switch (state.registry.get(appId)) {
      case null { null };
      case (?entry) {
        if (entry.launchType == #comingSoon) {
          return null;
        };
        let already = state.installed.values().any(func (app) = app.appId == appId);
        if (already) {
          return null;
        };
        let id = state.nextInstalledId;
        state.nextInstalledId := id + 1;
        let installed : InstalledApp = {
          id;
          appId;
          folderId = null;
          position = id;
          favourite = false;
          installedAt = Time.now();
        };
        state.installed.add(id, installed);
        ?installed;
      };
    };
  };

  public func uninstallApp(state : State, installedId : Nat) : Bool {
    switch (state.installed.get(installedId)) {
      case null { false };
      case (?_) {
        state.installed.remove(installedId);
        true;
      };
    };
  };

  public func listInstalled(state : State) : [InstalledApp] {
    state.installed.values().toArray();
  };

  public func setFavourite(state : State, installedId : Nat, favourite : Bool) : ?InstalledApp {
    switch (state.installed.get(installedId)) {
      case null { null };
      case (?app) {
        let updated : InstalledApp = {
          id = app.id;
          appId = app.appId;
          folderId = app.folderId;
          position = app.position;
          favourite;
          installedAt = app.installedAt;
        };
        state.installed.add(installedId, updated);
        ?updated;
      };
    };
  };

  /// Reorder the home screen. `orderedIds` lists installed-app ids in their new
  /// order; ids not present keep their relative order after the listed ones.
  public func reorder(state : State, orderedIds : [Nat]) : [InstalledApp] {
    var position = 0;
    for (id in orderedIds.values()) {
      switch (state.installed.get(id)) {
        case null {};
        case (?app) {
          state.installed.add(
            id,
            {
              id = app.id;
              appId = app.appId;
              folderId = app.folderId;
              position;
              favourite = app.favourite;
              installedAt = app.installedAt;
            },
          );
          position += 1;
        };
      };
    };
    let remaining = state.installed.values().toArray();
    let sorted = remaining.sort(func (a, b) = Nat.compare(a.position, b.position));
    for (app in sorted.values()) {
      if (not orderedIds.contains(app.id)) {
        state.installed.add(
          app.id,
          {
            id = app.id;
            appId = app.appId;
            folderId = app.folderId;
            position;
            favourite = app.favourite;
            installedAt = app.installedAt;
          },
        );
        position += 1;
      };
    };
    listInstalled(state);
  };

  public func createFolder(state : State, name : Text) : HomeFolder {
    let id = state.nextFolderId;
    state.nextFolderId := id + 1;
    let folder : HomeFolder = {
      id;
      name;
      position = id;
      createdAt = Time.now();
    };
    state.folders.add(id, folder);
    folder;
  };

  public func renameFolder(state : State, id : Nat, name : Text) : ?HomeFolder {
    switch (state.folders.get(id)) {
      case null { null };
      case (?folder) {
        let updated : HomeFolder = {
          id = folder.id;
          name;
          position = folder.position;
          createdAt = folder.createdAt;
        };
        state.folders.add(id, updated);
        ?updated;
      };
    };
  };

  public func moveAppToFolder(state : State, installedId : Nat, folderId : ?Nat) : ?InstalledApp {
    switch (state.installed.get(installedId)) {
      case null { null };
      case (?app) {
        let updated : InstalledApp = {
          id = app.id;
          appId = app.appId;
          folderId;
          position = app.position;
          favourite = app.favourite;
          installedAt = app.installedAt;
        };
        state.installed.add(installedId, updated);
        ?updated;
      };
    };
  };

  /// Delete a home folder; apps inside it return to the home screen.
  public func deleteFolder(state : State, id : Nat) : Bool {
    switch (state.folders.get(id)) {
      case null { false };
      case (?_) {
        state.folders.remove(id);
        let snapshot = state.installed.values().toArray();
        for (app in snapshot.values()) {
          switch (app.folderId) {
            case (?fid) {
              if (fid == id) {
                state.installed.add(
                  app.id,
                  {
                    id = app.id;
                    appId = app.appId;
                    folderId = null;
                    position = app.position;
                    favourite = app.favourite;
                    installedAt = app.installedAt;
                  },
                );
              };
            };
            case null {};
          };
        };
        true;
      };
    };
  };

  /// The home-screen layout: folders first, then apps not inside a folder,
  /// each ordered by position.
  public func listHomeItems(state : State) : [HomeItem] {
    let folders = state.folders.values().toArray();
    let sortedFolders = folders.sort(func (a, b) = Nat.compare(a.position, b.position));
    let apps = state.installed.values().toArray();
    let loose = apps.filter(func (app) = app.folderId == null);
    let sortedApps = loose.sort(func (a, b) = Nat.compare(a.position, b.position));
    let items = List.empty<HomeItem>();
    for (folder in sortedFolders.values()) {
      items.add(#folder(folder));
    };
    for (app in sortedApps.values()) {
      items.add(#app(app));
    };
    items.toArray();
  };

  public func getDock(state : State) : Dock {
    state.dock;
  };

  public func setDock(state : State, appIds : [Nat]) : Dock {
    let dock : Dock = { appIds };
    state.dock := dock;
    dock;
  };

  /// The caller's personal shortcuts and website links.
  public func listShortcuts(state : State) : [Shortcut] {
    state.shortcuts.values().toArray();
  };

  /// Create a personal shortcut or website link on the caller's home screen.
  /// The address is validated first; an invalid address is rejected with a
  /// clear message and nothing is stored.
  public func createShortcut(state : State, name : Text, url : Text, icon : Text, launchType : Types.LaunchType) : Shortcut {
    requireValidUrl(url);
    let id = state.nextShortcutId;
    state.nextShortcutId := id + 1;
    let shortcut : Shortcut = {
      id;
      name;
      url;
      icon;
      launchType;
      position = id;
      folderId = null;
      favourite = false;
      createdAt = Time.now();
    };
    state.shortcuts.add(id, shortcut);
    shortcut;
  };

  /// Rename a personal shortcut. Returns the updated shortcut, or `null` when
  /// the caller has no shortcut with that id.
  public func renameShortcut(state : State, id : Nat, name : Text) : ?Shortcut {
    switch (state.shortcuts.get(id)) {
      case null { null };
      case (?shortcut) {
        let updated : Shortcut = {
          id = shortcut.id;
          name;
          url = shortcut.url;
          icon = shortcut.icon;
          launchType = shortcut.launchType;
          position = shortcut.position;
          folderId = shortcut.folderId;
          favourite = shortcut.favourite;
          createdAt = shortcut.createdAt;
        };
        state.shortcuts.add(id, updated);
        ?updated;
      };
    };
  };

  /// Change the icon of a personal shortcut. Returns the updated shortcut, or
  /// `null` when the caller has no shortcut with that id.
  public func setShortcutIcon(state : State, id : Nat, icon : Text) : ?Shortcut {
    switch (state.shortcuts.get(id)) {
      case null { null };
      case (?shortcut) {
        let updated : Shortcut = {
          id = shortcut.id;
          name = shortcut.name;
          url = shortcut.url;
          icon;
          launchType = shortcut.launchType;
          position = shortcut.position;
          folderId = shortcut.folderId;
          favourite = shortcut.favourite;
          createdAt = shortcut.createdAt;
        };
        state.shortcuts.add(id, updated);
        ?updated;
      };
    };
  };

  /// Change the target URL of a personal shortcut. The address is validated
  /// first; an invalid address is rejected with a clear message and the stored
  /// shortcut is left unchanged. Returns the updated shortcut, or `null` when
  /// the caller has no shortcut with that id.
  public func setShortcutUrl(state : State, id : Nat, url : Text) : ?Shortcut {
    switch (state.shortcuts.get(id)) {
      case null { null };
      case (?shortcut) {
        requireValidUrl(url);
        let updated : Shortcut = {
          id = shortcut.id;
          name = shortcut.name;
          url;
          icon = shortcut.icon;
          launchType = shortcut.launchType;
          position = shortcut.position;
          folderId = shortcut.folderId;
          favourite = shortcut.favourite;
          createdAt = shortcut.createdAt;
        };
        state.shortcuts.add(id, updated);
        ?updated;
      };
    };
  };

  /// Favourite or unfavourite a personal shortcut. Returns the updated
  /// shortcut, or `null` when the caller has no shortcut with that id.
  public func setShortcutFavourite(state : State, id : Nat, favourite : Bool) : ?Shortcut {
    switch (state.shortcuts.get(id)) {
      case null { null };
      case (?shortcut) {
        let updated : Shortcut = {
          id = shortcut.id;
          name = shortcut.name;
          url = shortcut.url;
          icon = shortcut.icon;
          launchType = shortcut.launchType;
          position = shortcut.position;
          folderId = shortcut.folderId;
          favourite;
          createdAt = shortcut.createdAt;
        };
        state.shortcuts.add(id, updated);
        ?updated;
      };
    };
  };

  /// Move a personal shortcut into a home folder, or back to the home screen
  /// when `folderId` is `null`. Returns the updated shortcut, or `null` when
  /// the caller has no shortcut with that id.
  public func moveShortcutToFolder(state : State, id : Nat, folderId : ?Nat) : ?Shortcut {
    switch (state.shortcuts.get(id)) {
      case null { null };
      case (?shortcut) {
        let updated : Shortcut = {
          id = shortcut.id;
          name = shortcut.name;
          url = shortcut.url;
          icon = shortcut.icon;
          launchType = shortcut.launchType;
          position = shortcut.position;
          folderId;
          favourite = shortcut.favourite;
          createdAt = shortcut.createdAt;
        };
        state.shortcuts.add(id, updated);
        ?updated;
      };
    };
  };

  /// Remove a personal shortcut. Returns `true` when a shortcut was removed.
  public func removeShortcut(state : State, id : Nat) : Bool {
    switch (state.shortcuts.get(id)) {
      case null { false };
      case (?_) {
        state.shortcuts.remove(id);
        true;
      };
    };
  };
};
