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
import NotesLib "../lib/notes";
import Types "../types/notes";

/// OQL entity declarations for the Notes domain. The composition root includes
/// these in the `Expose` mixin so the Data Intelligence agent can query notes
/// and note folders. Rows are scoped per user: the owner principal is the outer
/// map key, so a scoped caller only ever sees its own rows.
module {
  /// A note row as exposed to OQL: the stored note plus its owner principal.
  type NoteRow = {
    id : Nat;
    owner : Principal;
    title : Text;
    body : Text;
    folderId : ?Nat;
    pinned : Bool;
    attachmentCount : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  /// A note-folder row as exposed to OQL: the stored folder plus its owner.
  type NoteFolderRow = {
    id : Nat;
    owner : Principal;
    name : Text;
    createdAt : Int;
    updatedAt : Int;
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

  func noteRows(states : Map.Map<Principal, NotesLib.State>) : Iter.Iter<NoteRow> {
    states.entries().flatMap(
      func ((owner, state)) {
        state.notes.values().map(
          func (note) {
            {
              id = note.id;
              owner;
              title = note.title;
              body = note.body;
              folderId = note.folderId;
              pinned = note.pinned;
              attachmentCount = note.attachments.size();
              createdAt = note.createdAt;
              updatedAt = note.updatedAt;
            };
          }
        );
      }
    );
  };

  func folderRows(states : Map.Map<Principal, NotesLib.State>) : Iter.Iter<NoteFolderRow> {
    states.entries().flatMap(
      func ((owner, state)) {
        state.folders.values().map(
          func (folder) {
            {
              id = folder.id;
              owner;
              name = folder.name;
              createdAt = folder.createdAt;
              updatedAt = folder.updatedAt;
            };
          }
        );
      }
    );
  };

  public func entities(states : Map.Map<Principal, NotesLib.State>) : [Entity.Decl] {
    [
      OQL.Entity.manual<NoteRow>("note", func () = noteRows(states), "Note", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          title = "";
          body = "";
          folderId = ?0;
          pinned = false;
          attachmentCount = 0;
          createdAt = 0;
          updatedAt = 0;
        })
        .payload("id", func r = r.id)
        .payload("owner", func r = r.owner)
        .payload("title", func r = r.title)
        .payload("body", func r = r.body)
        .payload("folderId", func r = r.folderId, optionalNatToValue)
        .payload("pinned", func r = r.pinned)
        .payload("attachmentCount", func r = r.attachmentCount)
        .payload("createdAt", func r = r.createdAt)
        .payload("updatedAt", func r = r.updatedAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      OQL.Entity.manual<NoteFolderRow>("noteFolder", func () = folderRows(states), "NoteFolder", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          name = "";
          createdAt = 0;
          updatedAt = 0;
        })
        .payload("id", func r = r.id)
        .payload("owner", func r = r.owner)
        .payload("name", func r = r.name)
        .payload("createdAt", func r = r.createdAt)
        .payload("updatedAt", func r = r.updatedAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
    ];
  };
};
