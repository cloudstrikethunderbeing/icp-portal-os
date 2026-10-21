import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import OQL "mo:caffeineai-oql";
import Entity "mo:caffeineai-oql/Entity";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import IntValue "mo:caffeineai-oql/IntValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import FilesLib "../lib/files";
import Types "../types/files";

/// OQL entity declarations for the Files domain. The composition root includes
/// these in the `Expose` mixin so the Data Intelligence agent can query files
/// and folders. Rows are scoped per user: the owner principal is the outer map
/// key, so a scoped caller only ever sees its own rows.
module {
  /// A file row as exposed to OQL: the stored entry plus its owner principal.
  type FileRow = {
    id : Nat;
    owner : Principal;
    name : Text;
    parentId : ?Nat;
    section : Text;
    sizeBytes : ?Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  /// A folder row as exposed to OQL: the stored folder plus its owner principal.
  type FolderRow = {
    id : Nat;
    owner : Principal;
    name : Text;
    parentId : ?Nat;
    section : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  func sectionText(section : Types.StorageSection) : Text {
    switch (section) {
      case (#local) { "local" };
      case (#icpCloud) { "icpCloud" };
    };
  };

  /// Explicit `_toRow` instance for `?Nat` payload columns. OQL 0.7.1 ships no
  /// implicit `?T -> Value` instance, so optional numeric columns must supply
  /// one; `null` maps to the `#null_` scalar.
  func optionalNatToValue(value : ?Nat) : OQL.Value {
    switch (value) {
      case (?n) { #nat n };
      case null { #null_ };
    };
  };

  func fileRows(states : Map.Map<Principal, FilesLib.State>) : Iter.Iter<FileRow> {
    states.entries().flatMap(
      func ((owner, state)) {
        state.files.values().map(
          func (file) {
            {
              id = file.id;
              owner;
              name = file.name;
              parentId = file.parentId;
              section = sectionText(file.section);
              sizeBytes = file.ref.sizeBytes;
              createdAt = file.createdAt;
              updatedAt = file.updatedAt;
            };
          }
        );
      }
    );
  };

  func folderRows(states : Map.Map<Principal, FilesLib.State>) : Iter.Iter<FolderRow> {
    states.entries().flatMap(
      func ((owner, state)) {
        state.folders.values().map(
          func (folder) {
            {
              id = folder.id;
              owner;
              name = folder.name;
              parentId = folder.parentId;
              section = sectionText(folder.section);
              createdAt = folder.createdAt;
              updatedAt = folder.updatedAt;
            };
          }
        );
      }
    );
  };

  public func entities(states : Map.Map<Principal, FilesLib.State>) : [Entity.Decl] {
    [
      OQL.Entity.manual<FileRow>("file", func () = fileRows(states), "File", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          name = "";
          parentId = ?0;
          section = "local";
          sizeBytes = ?0;
          createdAt = 0;
          updatedAt = 0;
        })
        .payload("id", func r = r.id)
        .payload("owner", func r = r.owner)
        .payload("name", func r = r.name)
        .payload("parentId", func r = r.parentId, optionalNatToValue)
        .payload("section", func r = r.section)
        .payload("sizeBytes", func r = r.sizeBytes, optionalNatToValue)
        .payload("createdAt", func r = r.createdAt)
        .payload("updatedAt", func r = r.updatedAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      OQL.Entity.manual<FolderRow>("folder", func () = folderRows(states), "Folder", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          name = "";
          parentId = ?0;
          section = "local";
          createdAt = 0;
          updatedAt = 0;
        })
        .payload("id", func r = r.id)
        .payload("owner", func r = r.owner)
        .payload("name", func r = r.name)
        .payload("parentId", func r = r.parentId, optionalNatToValue)
        .payload("section", func r = r.section)
        .payload("createdAt", func r = r.createdAt)
        .payload("updatedAt", func r = r.updatedAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
    ];
  };
};
