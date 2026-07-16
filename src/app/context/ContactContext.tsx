// Contact context — useReducer-based state management for the Contacts module.
// Frontend-only. No backend calls, no persistence, no real sync.
// All mutations go through the mock service SESSION_MUTATIONS store.

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Contact,
  ContactId,
  ContactTagId,
  ContactGroupId,
  ContactScope,
  ContactListQuery,
  ContactListResult,
  ContactGroupSummary,
  ContactUsageSummary,
  ContactDuplicateCandidate,
  ContactActionAvailability,
  ContactValidationResult,
  ContactCreateInput,
  ContactUpdateInput,
  ContactMergePreview,
  ContactImportPreview,
} from "../models/contacts";
import { DEFAULT_CONTACT_QUERY } from "../models/contacts";
import { mockContactService } from "../services/mock/contacts.service";

// ── State ─────────────────────────────────────────────────────────────────────

interface ContactState {
  // Library
  query:         ContactListQuery;
  listResult:    ContactListResult | null;
  listLoading:   boolean;
  listError:     string | null;

  // Active detail
  activeContact: Contact | null;
  activeLoading: boolean;
  activeError:   string | null;
  activeActions: ContactActionAvailability[];
  activeUsage:   ContactUsageSummary | null;
  activeDuplicates: ContactDuplicateCandidate[];

  // Groups sidebar
  groups:        ContactGroupSummary[];
  groupsLoading: boolean;

  // Pending op (archive/restore/merge/bulk)
  pendingOp:      string;
  pendingMessage: string | null;
  pendingError:   string | null;

  // Merge
  mergePreview:   ContactMergePreview | null;
  mergeLoading:   boolean;

  // Import
  importPreview:  ContactImportPreview | null;
  importLoading:  boolean;
}

const INITIAL_STATE: ContactState = {
  query:            DEFAULT_CONTACT_QUERY,
  listResult:       null,
  listLoading:      false,
  listError:        null,
  activeContact:    null,
  activeLoading:    false,
  activeError:      null,
  activeActions:    [],
  activeUsage:      null,
  activeDuplicates: [],
  groups:           [],
  groupsLoading:    false,
  pendingOp:        "none",
  pendingMessage:   null,
  pendingError:     null,
  mergePreview:     null,
  mergeLoading:     false,
  importPreview:    null,
  importLoading:    false,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type ContactAction =
  | { type: "SET_QUERY";           payload: Partial<ContactListQuery> }
  | { type: "LIST_LOADING" }
  | { type: "LIST_SUCCESS";        payload: ContactListResult }
  | { type: "LIST_ERROR";          payload: string }
  | { type: "ACTIVE_LOADING" }
  | { type: "ACTIVE_SUCCESS";      payload: { contact: Contact; actions: ContactActionAvailability[]; usage: ContactUsageSummary | null; duplicates: ContactDuplicateCandidate[] } }
  | { type: "ACTIVE_ERROR";        payload: string }
  | { type: "ACTIVE_CLEAR" }
  | { type: "GROUPS_LOADING" }
  | { type: "GROUPS_SUCCESS";      payload: ContactGroupSummary[] }
  | { type: "PENDING_START";       payload: string }
  | { type: "PENDING_SUCCESS";     payload: { contact?: Contact; message: string } }
  | { type: "PENDING_ERROR";       payload: string }
  | { type: "PENDING_CLEAR" }
  | { type: "MERGE_PREVIEW_LOAD" }
  | { type: "MERGE_PREVIEW_READY"; payload: ContactMergePreview | null }
  | { type: "IMPORT_LOADING" }
  | { type: "IMPORT_READY";        payload: ContactImportPreview }
  | { type: "WORKSPACE_SWITCH" };

function reducer(state: ContactState, action: ContactAction): ContactState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: { ...state.query, ...action.payload, page: action.payload.page ?? 1 } };
    case "LIST_LOADING":
      return { ...state, listLoading: true, listError: null };
    case "LIST_SUCCESS":
      return { ...state, listLoading: false, listResult: action.payload };
    case "LIST_ERROR":
      return { ...state, listLoading: false, listError: action.payload };
    case "ACTIVE_LOADING":
      return { ...state, activeLoading: true, activeError: null };
    case "ACTIVE_SUCCESS":
      return {
        ...state,
        activeLoading:    false,
        activeContact:    action.payload.contact,
        activeActions:    action.payload.actions,
        activeUsage:      action.payload.usage,
        activeDuplicates: action.payload.duplicates,
        activeError:      null,
      };
    case "ACTIVE_ERROR":
      return { ...state, activeLoading: false, activeError: action.payload };
    case "ACTIVE_CLEAR":
      return { ...state, activeContact: null, activeActions: [], activeUsage: null, activeDuplicates: [] };
    case "GROUPS_LOADING":
      return { ...state, groupsLoading: true };
    case "GROUPS_SUCCESS":
      return { ...state, groupsLoading: false, groups: action.payload };
    case "PENDING_START":
      return { ...state, pendingOp: action.payload, pendingMessage: null, pendingError: null };
    case "PENDING_SUCCESS":
      return {
        ...state,
        pendingOp:      "none",
        pendingMessage: action.payload.message,
        pendingError:   null,
        activeContact:  action.payload.contact ?? state.activeContact,
      };
    case "PENDING_ERROR":
      return { ...state, pendingOp: "none", pendingError: action.payload };
    case "PENDING_CLEAR":
      return { ...state, pendingOp: "none", pendingMessage: null, pendingError: null };
    case "MERGE_PREVIEW_LOAD":
      return { ...state, mergeLoading: true, mergePreview: null };
    case "MERGE_PREVIEW_READY":
      return { ...state, mergeLoading: false, mergePreview: action.payload };
    case "IMPORT_LOADING":
      return { ...state, importLoading: true };
    case "IMPORT_READY":
      return { ...state, importLoading: false, importPreview: action.payload };
    case "WORKSPACE_SWITCH":
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

// ── Context value ─────────────────────────────────────────────────────────────

interface ContactContextValue {
  state: ContactState;

  // Query
  setQuery:        (q: Partial<ContactListQuery>) => void;
  asyncLoadList:   () => Promise<void>;
  asyncLoadGroups: () => Promise<void>;

  // Active contact
  asyncLoadContact:  (id: ContactId) => Promise<void>;
  clearActiveContact: () => void;

  // CRUD
  asyncCreate:  (input: ContactCreateInput)                          => Promise<Contact>;
  asyncUpdate:  (id: ContactId, input: ContactUpdateInput)           => Promise<Contact>;
  asyncArchive: (id: ContactId)                                      => Promise<void>;
  asyncRestore: (id: ContactId)                                      => Promise<void>;
  asyncAddTag:  (id: ContactId, tagId: ContactTagId)                 => Promise<void>;
  asyncRemoveTag: (id: ContactId, tagId: ContactTagId)               => Promise<void>;

  // Bulk
  asyncBulkArchive:  (ids: ContactId[])                              => Promise<void>;
  asyncBulkRestore:  (ids: ContactId[])                              => Promise<void>;
  asyncBulkAddTag:   (ids: ContactId[], tagId: ContactTagId)         => Promise<void>;
  asyncBulkRemoveTag:(ids: ContactId[], tagId: ContactTagId)         => Promise<void>;
  asyncBulkAddToGroup:(ids: ContactId[], groupId: ContactGroupId)    => Promise<void>;

  // Validation + duplicates
  asyncValidate:     (input: Partial<ContactCreateInput>, existingId?: ContactId) => Promise<ContactValidationResult>;
  asyncFindDuplicates:(name: string, email: string, excludeId?: ContactId)        => Promise<ContactDuplicateCandidate[]>;

  // Merge
  asyncPreviewMerge: (primaryId: ContactId, secondaryId: ContactId) => Promise<void>;
  asyncMerge:        (primaryId: ContactId, secondaryId: ContactId)  => Promise<Contact>;

  // Import
  asyncLoadImportPreview: () => Promise<void>;

  // Group mutations
  asyncCreateGroup:           (name: string, description: string, scope: ContactScope) => Promise<void>;
  asyncArchiveGroup:          (id: ContactGroupId) => Promise<void>;
  asyncRestoreGroup:          (id: ContactGroupId) => Promise<void>;
  asyncAddContactsToGroup:    (groupId: ContactGroupId, contactIds: ContactId[]) => Promise<void>;
  asyncRemoveContactsFromGroup:(groupId: ContactGroupId, contactIds: ContactId[]) => Promise<void>;

  // Pending feedback
  clearPending: () => void;

  // Workspace switch
  clearForWorkspaceSwitch: () => void;
}

const ContactCtx = createContext<ContactContextValue | null>(null);

export function ContactProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const setQuery = useCallback((q: Partial<ContactListQuery>) => {
    dispatch({ type: "SET_QUERY", payload: q });
  }, []);

  const asyncLoadList = useCallback(async () => {
    dispatch({ type: "LIST_LOADING" });
    try {
      // Use current state via closure — note: we need to read latest query from state
      const result = await mockContactService.listContacts(state.query);
      dispatch({ type: "LIST_SUCCESS", payload: result });
    } catch {
      dispatch({ type: "LIST_ERROR", payload: "Could not load contacts. Please try again." });
    }
  }, [state.query]);

  const asyncLoadGroups = useCallback(async () => {
    dispatch({ type: "GROUPS_LOADING" });
    try {
      const groups = await mockContactService.listGroups();
      dispatch({ type: "GROUPS_SUCCESS", payload: groups });
    } catch {
      // Non-fatal — groups sidebar degrades silently
    }
  }, []);

  const asyncLoadContact = useCallback(async (id: ContactId) => {
    dispatch({ type: "ACTIVE_LOADING" });
    try {
      const [contact, actions, usage, duplicates] = await Promise.all([
        mockContactService.getContact(id),
        mockContactService.getContactActionAvailability(id),
        mockContactService.getUsageSummary(id),
        mockContactService.getDuplicateCandidates(id),
      ]);
      if (!contact) {
        dispatch({ type: "ACTIVE_ERROR", payload: "Contact not found." });
        return;
      }
      dispatch({ type: "ACTIVE_SUCCESS", payload: { contact, actions, usage: usage ?? null, duplicates } });
    } catch {
      dispatch({ type: "ACTIVE_ERROR", payload: "Could not load contact details." });
    }
  }, []);

  const clearActiveContact = useCallback(() => {
    dispatch({ type: "ACTIVE_CLEAR" });
  }, []);

  const asyncCreate = useCallback(async (input: ContactCreateInput): Promise<Contact> => {
    dispatch({ type: "PENDING_START", payload: "create" });
    try {
      const contact = await mockContactService.createContact(input);
      dispatch({ type: "PENDING_SUCCESS", payload: { contact, message: "Contact added in this frontend session." } });
      return contact;
    } catch (e: unknown) {
      dispatch({ type: "PENDING_ERROR", payload: "Could not create contact." });
      throw e;
    }
  }, []);

  const asyncUpdate = useCallback(async (id: ContactId, input: ContactUpdateInput): Promise<Contact> => {
    dispatch({ type: "PENDING_START", payload: "update" });
    try {
      const contact = await mockContactService.updateContact(id, input);
      dispatch({ type: "PENDING_SUCCESS", payload: { contact, message: "Contact updated in this frontend session." } });
      return contact;
    } catch (e: unknown) {
      dispatch({ type: "PENDING_ERROR", payload: "Could not update contact." });
      throw e;
    }
  }, []);

  const asyncArchive = useCallback(async (id: ContactId) => {
    dispatch({ type: "PENDING_START", payload: "archive" });
    try {
      const contact = await mockContactService.archiveContact(id);
      dispatch({ type: "PENDING_SUCCESS", payload: { contact, message: "Contact archived in this frontend session." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not archive contact." });
    }
  }, []);

  const asyncRestore = useCallback(async (id: ContactId) => {
    dispatch({ type: "PENDING_START", payload: "restore" });
    try {
      const contact = await mockContactService.restoreContact(id);
      dispatch({ type: "PENDING_SUCCESS", payload: { contact, message: "Contact restored in this frontend session." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not restore contact." });
    }
  }, []);

  const asyncAddTag = useCallback(async (id: ContactId, tagId: ContactTagId) => {
    try {
      const contact = await mockContactService.addTagToContact(id, tagId);
      dispatch({ type: "PENDING_SUCCESS", payload: { contact, message: "Tag added." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not add tag." });
    }
  }, []);

  const asyncRemoveTag = useCallback(async (id: ContactId, tagId: ContactTagId) => {
    try {
      const contact = await mockContactService.removeTagFromContact(id, tagId);
      dispatch({ type: "PENDING_SUCCESS", payload: { contact, message: "Tag removed." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not remove tag." });
    }
  }, []);

  const asyncBulkArchive = useCallback(async (ids: ContactId[]) => {
    dispatch({ type: "PENDING_START", payload: "bulk-archive" });
    try {
      await mockContactService.bulkArchive(ids);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: `${ids.length} contact${ids.length !== 1 ? "s" : ""} archived in this frontend session.` } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Bulk archive failed." });
    }
  }, []);

  const asyncBulkRestore = useCallback(async (ids: ContactId[]) => {
    dispatch({ type: "PENDING_START", payload: "bulk-restore" });
    try {
      await mockContactService.bulkRestore(ids);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: `${ids.length} contact${ids.length !== 1 ? "s" : ""} restored.` } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Bulk restore failed." });
    }
  }, []);

  const asyncBulkAddTag = useCallback(async (ids: ContactId[], tagId: ContactTagId) => {
    dispatch({ type: "PENDING_START", payload: "bulk-tag" });
    try {
      await mockContactService.bulkAddTag(ids, tagId);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: "Tag applied to selected contacts." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not apply tag." });
    }
  }, []);

  const asyncBulkRemoveTag = useCallback(async (ids: ContactId[], tagId: ContactTagId) => {
    dispatch({ type: "PENDING_START", payload: "bulk-remove-tag" });
    try {
      await mockContactService.bulkRemoveTag(ids, tagId);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: "Tag removed from selected contacts." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not remove tag." });
    }
  }, []);

  const asyncBulkAddToGroup = useCallback(async (ids: ContactId[], groupId: ContactGroupId) => {
    dispatch({ type: "PENDING_START", payload: "bulk-group" });
    try {
      await mockContactService.bulkAddToGroup(ids, groupId);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: "Contacts added to group." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not add to group." });
    }
  }, []);

  const asyncValidate = useCallback(async (input: Partial<ContactCreateInput>, existingId?: ContactId): Promise<ContactValidationResult> => {
    return mockContactService.validateContact(input, existingId);
  }, []);

  const asyncFindDuplicates = useCallback(async (name: string, email: string, excludeId?: ContactId): Promise<ContactDuplicateCandidate[]> => {
    return mockContactService.findDuplicates(name, email, excludeId);
  }, []);

  const asyncPreviewMerge = useCallback(async (primaryId: ContactId, secondaryId: ContactId) => {
    dispatch({ type: "MERGE_PREVIEW_LOAD" });
    try {
      const preview = await mockContactService.previewMerge(primaryId, secondaryId);
      dispatch({ type: "MERGE_PREVIEW_READY", payload: preview });
    } catch {
      dispatch({ type: "MERGE_PREVIEW_READY", payload: null });
    }
  }, []);

  const asyncMerge = useCallback(async (primaryId: ContactId, secondaryId: ContactId): Promise<Contact> => {
    dispatch({ type: "PENDING_START", payload: "merge" });
    try {
      const preview = await mockContactService.previewMerge(primaryId, secondaryId);
      if (!preview) throw new Error("Merge preview unavailable.");
      const contact = await mockContactService.mergeContactsDemonstration(primaryId, secondaryId, preview);
      dispatch({ type: "PENDING_SUCCESS", payload: { contact, message: "Contacts merged in this frontend demonstration. No backend record changed." } });
      return contact;
    } catch (e: unknown) {
      dispatch({ type: "PENDING_ERROR", payload: "Could not merge contacts." });
      throw e;
    }
  }, []);

  const asyncLoadImportPreview = useCallback(async () => {
    dispatch({ type: "IMPORT_LOADING" });
    try {
      const preview = await mockContactService.getImportPreview();
      dispatch({ type: "IMPORT_READY", payload: preview });
    } catch {
      // non-fatal
    }
  }, []);

  const asyncCreateGroup = useCallback(async (name: string, description: string, scope: ContactScope) => {
    dispatch({ type: "PENDING_START", payload: "create-group" });
    try {
      await mockContactService.createGroup(name, description, scope);
      const groups = await mockContactService.listGroups();
      dispatch({ type: "GROUPS_SUCCESS", payload: groups });
      dispatch({ type: "PENDING_SUCCESS", payload: { message: "Group created in this frontend session." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not create group." });
    }
  }, []);

  const asyncArchiveGroup = useCallback(async (id: ContactGroupId) => {
    dispatch({ type: "PENDING_START", payload: "archive-group" });
    try {
      await mockContactService.archiveGroup(id);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: "Group archived in this frontend session." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not archive group." });
    }
  }, []);

  const asyncRestoreGroup = useCallback(async (id: ContactGroupId) => {
    dispatch({ type: "PENDING_START", payload: "restore-group" });
    try {
      await mockContactService.restoreGroup(id);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: "Group restored in this frontend session." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not restore group." });
    }
  }, []);

  const asyncAddContactsToGroup = useCallback(async (groupId: ContactGroupId, contactIds: ContactId[]) => {
    dispatch({ type: "PENDING_START", payload: "add-to-group" });
    try {
      await mockContactService.addContactsToGroup(groupId, contactIds);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: "Contacts added to group." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not add contacts to group." });
    }
  }, []);

  const asyncRemoveContactsFromGroup = useCallback(async (groupId: ContactGroupId, contactIds: ContactId[]) => {
    dispatch({ type: "PENDING_START", payload: "remove-from-group" });
    try {
      await mockContactService.removeContactsFromGroup(groupId, contactIds);
      dispatch({ type: "PENDING_SUCCESS", payload: { message: "Contact removed from group." } });
    } catch {
      dispatch({ type: "PENDING_ERROR", payload: "Could not remove contact from group." });
    }
  }, []);

  const clearPending = useCallback(() => {
    dispatch({ type: "PENDING_CLEAR" });
  }, []);

  const clearForWorkspaceSwitch = useCallback(() => {
    mockContactService.clearSessionState();
    dispatch({ type: "WORKSPACE_SWITCH" });
  }, []);

  const value: ContactContextValue = {
    state,
    setQuery,
    asyncLoadList,
    asyncLoadGroups,
    asyncLoadContact,
    clearActiveContact,
    asyncCreate,
    asyncUpdate,
    asyncArchive,
    asyncRestore,
    asyncAddTag,
    asyncRemoveTag,
    asyncBulkArchive,
    asyncBulkRestore,
    asyncBulkAddTag,
    asyncBulkRemoveTag,
    asyncBulkAddToGroup,
    asyncValidate,
    asyncFindDuplicates,
    asyncPreviewMerge,
    asyncMerge,
    asyncLoadImportPreview,
    asyncCreateGroup,
    asyncArchiveGroup,
    asyncRestoreGroup,
    asyncAddContactsToGroup,
    asyncRemoveContactsFromGroup,
    clearPending,
    clearForWorkspaceSwitch,
  };

  return <ContactCtx.Provider value={value}>{children}</ContactCtx.Provider>;
}

export function useContacts(): ContactContextValue {
  const ctx = useContext(ContactCtx);
  if (!ctx) throw new Error("useContacts must be used inside ContactProvider");
  return ctx;
}
