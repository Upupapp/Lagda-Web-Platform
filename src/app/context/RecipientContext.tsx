// Recipient flow state machine.
// All state is in-memory. Nothing is persisted to localStorage or sessionStorage.
// No signature data, field values, auth codes, or participant PII leaves this context.

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";
import type {
  RecipientRequest,
  RecipientField,
  RecipientDocument,
  RecipientPage,
  RecipientFlowStep,
  UnavailableReason,
  AuthState,
  SignatureAdoption,
  SignatureAdoptionMethod,
  RecipientCompletionSummary,
  ApprovalDecision,
  ReviewDecision,
  RecipientParticipantRole,
} from "../models/recipient";
import { TYPED_SIGNATURE_STYLES } from "../models/recipient";
import {
  initializeRequest,
  submitAuthChallenge,
  acceptConsent,
  submitAction,
  declineRequest,
  validateAction,
  validateSignatureAdoption,
  clearSession,
  getCompletionHeading,
} from "../services/mock/recipient.service";

// ── State shape ───────────────────────────────────────────────────────────────

interface RecipientState {
  step:              RecipientFlowStep;
  request:           RecipientRequest | null;
  unavailableReason: UnavailableReason | null;
  errorMessage:      string | null;

  // Auth
  authState:         AuthState;
  authCode:          string;

  // Consent
  consentAccepted:   boolean;

  // Document navigation
  currentDocumentId: string | null;
  currentPageId:     string | null;

  // Field values: fieldId → value (in-memory)
  fieldValues:       Record<string, string | boolean | null>;

  // Signature
  signature:         SignatureAdoption;
  initials:          SignatureAdoption;
  showSignatureDialog: boolean;
  signatureTargetField: "signature" | "initials" | null;

  // Approver decision
  approvalDecision:  ApprovalDecision;
  approvalNotes:     string;

  // Reviewer decision
  reviewDecision:    ReviewDecision;
  reviewNotes:       string;

  // Decline
  declineReasonId:   string;
  declineNote:       string;

  // Completion
  completionSummary: RecipientCompletionSummary | null;
  completionDeclined: boolean;

  // Validation errors (field-level)
  fieldErrors:       Record<string, string>;
  globalError:       string | null;
}

const defaultSignatureAdoption = (): SignatureAdoption => ({
  method:       "typed",
  typedText:    "",
  styleIndex:   0,
  drawnDataUrl: null,
  adopted:      false,
});

const initialState: RecipientState = {
  step:               "initializing",
  request:            null,
  unavailableReason:  null,
  errorMessage:       null,
  authState:          "idle",
  authCode:           "",
  consentAccepted:    false,
  currentDocumentId:  null,
  currentPageId:      null,
  fieldValues:        {},
  signature:          defaultSignatureAdoption(),
  initials:           defaultSignatureAdoption(),
  showSignatureDialog:false,
  signatureTargetField:null,
  approvalDecision:   null,
  approvalNotes:      "",
  reviewDecision:     null,
  reviewNotes:        "",
  declineReasonId:    "",
  declineNote:        "",
  completionSummary:  null,
  completionDeclined: false,
  fieldErrors:        {},
  globalError:        null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "INIT_SUCCESS"; request: RecipientRequest }
  | { type: "INIT_UNAVAILABLE"; reason: UnavailableReason }
  | { type: "INIT_ERROR"; message: string }
  | { type: "SET_STEP"; step: RecipientFlowStep }
  | { type: "SET_AUTH_CODE"; code: string }
  | { type: "AUTH_SUCCESS" }
  | { type: "AUTH_FAIL"; authState: AuthState }
  | { type: "CONSENT_ACCEPT" }
  | { type: "SET_DOCUMENT"; documentId: string; pageId: string }
  | { type: "SET_PAGE"; pageId: string }
  | { type: "SET_FIELD_VALUE"; fieldId: string; value: string | boolean | null }
  | { type: "OPEN_SIGNATURE_DIALOG"; target: "signature" | "initials" }
  | { type: "CLOSE_SIGNATURE_DIALOG" }
  | { type: "SET_SIGNATURE_METHOD"; method: SignatureAdoptionMethod; target: "signature" | "initials" }
  | { type: "SET_SIGNATURE_TYPED_TEXT"; text: string; target: "signature" | "initials" }
  | { type: "SET_SIGNATURE_STYLE"; idx: number; target: "signature" | "initials" }
  | { type: "SET_SIGNATURE_DRAWN"; dataUrl: string; target: "signature" | "initials" }
  | { type: "ADOPT_SIGNATURE"; target: "signature" | "initials" }
  | { type: "SET_APPROVAL_DECISION"; decision: ApprovalDecision }
  | { type: "SET_APPROVAL_NOTES"; notes: string }
  | { type: "SET_REVIEW_DECISION"; decision: ReviewDecision }
  | { type: "SET_REVIEW_NOTES"; notes: string }
  | { type: "SET_DECLINE_REASON"; reasonId: string }
  | { type: "SET_DECLINE_NOTE"; note: string }
  | { type: "SUBMIT_SUCCESS"; summary: RecipientCompletionSummary }
  | { type: "DECLINE_SUCCESS"; summary: RecipientCompletionSummary }
  | { type: "SET_FIELD_ERROR"; fieldId: string; message: string }
  | { type: "CLEAR_FIELD_ERROR"; fieldId: string }
  | { type: "SET_GLOBAL_ERROR"; message: string | null }
  | { type: "CLEAR_SESSION" };

// ── Reducer ───────────────────────────────────────────────────────────────────

function updateSignatureField(
  state: RecipientState,
  target: "signature" | "initials",
  patch: Partial<SignatureAdoption>,
): RecipientState {
  const current = target === "signature" ? state.signature : state.initials;
  const updated  = { ...current, ...patch };
  return target === "signature"
    ? { ...state, signature: updated }
    : { ...state, initials:  updated };
}

function reducer(state: RecipientState, action: Action): RecipientState {
  switch (action.type) {
    case "INIT_SUCCESS": {
      const req   = action.request;
      const firstDoc  = req.documents[0] ?? null;
      const firstPage = firstDoc?.pages[0] ?? null;
      return {
        ...state,
        step:               req.participant.authRequired  ? "auth"
                          : req.participant.consentRequired ? "consent"
                          : "review",
        request:            req,
        unavailableReason:  null,
        errorMessage:       null,
        currentDocumentId:  firstDoc?.id   ?? null,
        currentPageId:      firstPage?.id  ?? null,
        authState:          req.participant.authRequired ? "idle" : "success",
        consentAccepted:    !req.participant.consentRequired,
      };
    }
    case "INIT_UNAVAILABLE":
      return { ...state, step: "unavailable", unavailableReason: action.reason };
    case "INIT_ERROR":
      return { ...state, step: "error", errorMessage: action.message };
    case "SET_STEP":
      return { ...state, step: action.step, globalError: null };
    case "SET_AUTH_CODE":
      return { ...state, authCode: action.code, authState: "idle" };
    case "AUTH_SUCCESS":
      return {
        ...state,
        authState: "success",
        authCode:  "",
        step:      state.request?.participant.consentRequired ? "consent" : "review",
      };
    case "AUTH_FAIL":
      return { ...state, authState: action.authState };
    case "CONSENT_ACCEPT":
      return { ...state, consentAccepted: true, step: "review" };
    case "SET_DOCUMENT":
      return { ...state, currentDocumentId: action.documentId, currentPageId: action.pageId };
    case "SET_PAGE":
      return { ...state, currentPageId: action.pageId };
    case "SET_FIELD_VALUE": {
      const newValues = { ...state.fieldValues, [action.fieldId]: action.value };
      const newErrors = { ...state.fieldErrors };
      delete newErrors[action.fieldId];
      return { ...state, fieldValues: newValues, fieldErrors: newErrors };
    }
    case "OPEN_SIGNATURE_DIALOG":
      return { ...state, showSignatureDialog: true, signatureTargetField: action.target };
    case "CLOSE_SIGNATURE_DIALOG":
      return { ...state, showSignatureDialog: false, signatureTargetField: null };
    case "SET_SIGNATURE_METHOD":
      return updateSignatureField(state, action.target, { method: action.method });
    case "SET_SIGNATURE_TYPED_TEXT":
      return updateSignatureField(state, action.target, { typedText: action.text });
    case "SET_SIGNATURE_STYLE":
      return updateSignatureField(state, action.target, { styleIndex: action.idx });
    case "SET_SIGNATURE_DRAWN":
      return updateSignatureField(state, action.target, { drawnDataUrl: action.dataUrl });
    case "ADOPT_SIGNATURE": {
      const updated = { ...(action.target === "signature" ? state.signature : state.initials), adopted: true };
      return action.target === "signature"
        ? { ...state, signature: updated, showSignatureDialog: false, signatureTargetField: null }
        : { ...state, initials:  updated, showSignatureDialog: false, signatureTargetField: null };
    }
    case "SET_APPROVAL_DECISION":
      return { ...state, approvalDecision: action.decision };
    case "SET_APPROVAL_NOTES":
      return { ...state, approvalNotes: action.notes };
    case "SET_REVIEW_DECISION":
      return { ...state, reviewDecision: action.decision };
    case "SET_REVIEW_NOTES":
      return { ...state, reviewNotes: action.notes };
    case "SET_DECLINE_REASON":
      return { ...state, declineReasonId: action.reasonId };
    case "SET_DECLINE_NOTE":
      return { ...state, declineNote: action.note };
    case "SUBMIT_SUCCESS":
      return { ...state, step: "complete", completionSummary: action.summary, completionDeclined: false };
    case "DECLINE_SUCCESS":
      return { ...state, step: "complete", completionSummary: action.summary, completionDeclined: true };
    case "SET_FIELD_ERROR":
      return { ...state, fieldErrors: { ...state.fieldErrors, [action.fieldId]: action.message } };
    case "CLEAR_FIELD_ERROR": {
      const e = { ...state.fieldErrors };
      delete e[action.fieldId];
      return { ...state, fieldErrors: e };
    }
    case "SET_GLOBAL_ERROR":
      return { ...state, globalError: action.message };
    case "CLEAR_SESSION":
      clearSession();
      return { ...initialState };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface RecipientContextValue {
  // State
  state: RecipientState;

  // Derived
  request:            RecipientRequest | null;
  step:               RecipientFlowStep;
  currentDocument:    RecipientDocument | null;
  currentPage:        RecipientPage | null;
  myFields:           RecipientField[];
  currentPageFields:  RecipientField[];
  requiredMyFieldIds: string[];
  allRequiredComplete: boolean;
  completionHeading:  string;
  role:               RecipientParticipantRole | null;

  // Actions
  loadRequest:          (requestId: string) => void;
  setStep:              (step: RecipientFlowStep) => void;
  setAuthCode:          (code: string) => void;
  submitAuth:           () => void;
  acceptConsentAction:  () => void;
  setDocument:          (docId: string) => void;
  setPage:              (pageId: string) => void;
  setFieldValue:        (fieldId: string, value: string | boolean | null) => void;
  openSignatureDialog:  (target: "signature" | "initials") => void;
  closeSignatureDialog: () => void;
  setSignatureMethod:   (method: SignatureAdoptionMethod, target: "signature" | "initials") => void;
  setSignatureTypedText:(text: string, target: "signature" | "initials") => void;
  setSignatureStyle:    (idx: number, target: "signature" | "initials") => void;
  setSignatureDrawn:    (dataUrl: string, target: "signature" | "initials") => void;
  adoptSignature:       (target: "signature" | "initials") => void;
  setApprovalDecision:  (d: ApprovalDecision) => void;
  setApprovalNotes:     (n: string) => void;
  setReviewDecision:    (d: ReviewDecision) => void;
  setReviewNotes:       (n: string) => void;
  goToSummary:          () => void;
  submitFinalAction:    () => void;
  setDeclineReason:     (id: string) => void;
  setDeclineNote:       (n: string) => void;
  submitDecline:        () => void;
  endSession:           () => void;
}

const RecipientContext = createContext<RecipientContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function RecipientProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const currentDocument = useMemo(
    () => state.request?.documents.find(d => d.id === state.currentDocumentId) ?? null,
    [state.request, state.currentDocumentId],
  );

  const currentPage = useMemo(
    () => currentDocument?.pages.find(p => p.id === state.currentPageId) ?? null,
    [currentDocument, state.currentPageId],
  );

  const myFields = useMemo(
    () => state.request?.fields.filter(f => f.assignedToMe && !f.isSenderText) ?? [],
    [state.request],
  );

  const currentPageFields = useMemo(
    () => state.request?.fields.filter(f => f.pageId === state.currentPageId) ?? [],
    [state.request, state.currentPageId],
  );

  const requiredMyFieldIds = useMemo(
    () => myFields.filter(f => f.required).map(f => f.id),
    [myFields],
  );

  const allRequiredComplete = useMemo(() => {
    for (const fieldId of requiredMyFieldIds) {
      const val = state.fieldValues[fieldId];
      if (val === undefined || val === null || val === "" || val === false) return false;
    }
    const role = state.request?.participant.role;
    if (role === "signer" && !state.signature.adopted) return false;
    return true;
  }, [requiredMyFieldIds, state.fieldValues, state.request, state.signature.adopted]);

  const role = state.request?.participant.role ?? null;

  const completionHeading = useMemo(() => {
    if (!state.request) return "Completed";
    return getCompletionHeading(
      state.request.participant.role,
      state.approvalDecision,
      state.reviewDecision,
      state.completionDeclined,
    );
  }, [state.request, state.approvalDecision, state.reviewDecision, state.completionDeclined]);

  // ── Callbacks ────────────────────────────────────────────────────────────────

  const loadRequest = useCallback((requestId: string) => {
    const result = initializeRequest(requestId);
    if (result.ok) {
      dispatch({ type: "INIT_SUCCESS", request: result.request });
    } else {
      dispatch({ type: "INIT_UNAVAILABLE", reason: result.reason });
    }
  }, []);

  const setStep = useCallback((step: RecipientFlowStep) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const setAuthCode = useCallback((code: string) => {
    dispatch({ type: "SET_AUTH_CODE", code });
  }, []);

  const submitAuth = useCallback(() => {
    dispatch({ type: "SET_STEP", step: "auth" });
    const result = submitAuthChallenge(state.authCode);
    if (result.ok) {
      dispatch({ type: "AUTH_SUCCESS" });
    } else {
      dispatch({ type: "AUTH_FAIL", authState: result.authState });
    }
  }, [state.authCode]);

  const acceptConsentAction = useCallback(() => {
    acceptConsent();
    dispatch({ type: "CONSENT_ACCEPT" });
  }, []);

  const setDocument = useCallback((docId: string) => {
    const doc = state.request?.documents.find(d => d.id === docId);
    if (!doc) return;
    dispatch({ type: "SET_DOCUMENT", documentId: docId, pageId: doc.pages[0]?.id ?? "" });
  }, [state.request]);

  const setPage = useCallback((pageId: string) => {
    dispatch({ type: "SET_PAGE", pageId });
  }, []);

  const setFieldValue = useCallback((fieldId: string, value: string | boolean | null) => {
    dispatch({ type: "SET_FIELD_VALUE", fieldId, value });
  }, []);

  const openSignatureDialog = useCallback((target: "signature" | "initials") => {
    dispatch({ type: "OPEN_SIGNATURE_DIALOG", target });
  }, []);

  const closeSignatureDialog = useCallback(() => {
    dispatch({ type: "CLOSE_SIGNATURE_DIALOG" });
  }, []);

  const setSignatureMethod = useCallback((method: SignatureAdoptionMethod, target: "signature" | "initials") => {
    dispatch({ type: "SET_SIGNATURE_METHOD", method, target });
  }, []);

  const setSignatureTypedText = useCallback((text: string, target: "signature" | "initials") => {
    dispatch({ type: "SET_SIGNATURE_TYPED_TEXT", text, target });
  }, []);

  const setSignatureStyle = useCallback((idx: number, target: "signature" | "initials") => {
    dispatch({ type: "SET_SIGNATURE_STYLE", idx, target });
  }, []);

  const setSignatureDrawn = useCallback((dataUrl: string, target: "signature" | "initials") => {
    dispatch({ type: "SET_SIGNATURE_DRAWN", dataUrl, target });
  }, []);

  const adoptSignature = useCallback((target: "signature" | "initials") => {
    const adoption = target === "signature" ? state.signature : state.initials;
    const validationResult = validateSignatureAdoption(
      adoption.method,
      adoption.typedText,
      adoption.drawnDataUrl,
    );
    if (!validationResult.ok) {
      dispatch({ type: "SET_GLOBAL_ERROR", message: validationResult.message });
      return;
    }
    dispatch({ type: "ADOPT_SIGNATURE", target });
  }, [state.signature, state.initials]);

  const setApprovalDecision = useCallback((d: ApprovalDecision) => {
    dispatch({ type: "SET_APPROVAL_DECISION", decision: d });
  }, []);

  const setApprovalNotes = useCallback((n: string) => {
    dispatch({ type: "SET_APPROVAL_NOTES", notes: n });
  }, []);

  const setReviewDecision = useCallback((d: ReviewDecision) => {
    dispatch({ type: "SET_REVIEW_DECISION", decision: d });
  }, []);

  const setReviewNotes = useCallback((n: string) => {
    dispatch({ type: "SET_REVIEW_NOTES", notes: n });
  }, []);

  const goToSummary = useCallback(() => {
    dispatch({ type: "SET_STEP", step: "summary" });
  }, []);

  const submitFinalAction = useCallback(() => {
    if (!state.request) return;
    const fieldValuesMap = new Map<string, string | boolean | null>(
      Object.entries(state.fieldValues),
    );
    const validation = validateAction(
      state.request.participant.role,
      requiredMyFieldIds,
      fieldValuesMap,
      state.signature.adopted,
      state.initials.adopted,
    );
    if (!validation.ok) {
      dispatch({ type: "SET_GLOBAL_ERROR", message: "Please complete all required fields before submitting." });
      return;
    }

    const result = submitAction(
      state.request,
      myFields.filter(f => {
        const val = state.fieldValues[f.id];
        return val !== undefined && val !== null && val !== "" && val !== false;
      }).length,
      state.signature.adopted,
      state.signature.adopted ? state.signature.method : null,
      state.consentAccepted,
      state.approvalDecision,
      state.reviewDecision,
    );

    if (result.ok) {
      dispatch({ type: "SUBMIT_SUCCESS", summary: result.summary });
    } else {
      dispatch({ type: "SET_GLOBAL_ERROR", message: result.message });
    }
  }, [state, requiredMyFieldIds, myFields]);

  const setDeclineReason = useCallback((id: string) => {
    dispatch({ type: "SET_DECLINE_REASON", reasonId: id });
  }, []);

  const setDeclineNote = useCallback((n: string) => {
    dispatch({ type: "SET_DECLINE_NOTE", note: n });
  }, []);

  const submitDecline = useCallback(() => {
    if (!state.request) return;
    const result = declineRequest(state.request, state.declineReasonId, state.declineNote);
    if (result.ok) {
      dispatch({ type: "DECLINE_SUCCESS", summary: result.summary });
    }
  }, [state.request, state.declineReasonId, state.declineNote]);

  const endSession = useCallback(() => {
    dispatch({ type: "CLEAR_SESSION" });
  }, []);

  // ── Context value ────────────────────────────────────────────────────────────

  const value: RecipientContextValue = useMemo(() => ({
    state,
    request:             state.request,
    step:                state.step,
    currentDocument,
    currentPage,
    myFields,
    currentPageFields,
    requiredMyFieldIds,
    allRequiredComplete,
    completionHeading,
    role,
    loadRequest,
    setStep,
    setAuthCode,
    submitAuth,
    acceptConsentAction,
    setDocument,
    setPage,
    setFieldValue,
    openSignatureDialog,
    closeSignatureDialog,
    setSignatureMethod,
    setSignatureTypedText,
    setSignatureStyle,
    setSignatureDrawn,
    adoptSignature,
    setApprovalDecision,
    setApprovalNotes,
    setReviewDecision,
    setReviewNotes,
    goToSummary,
    submitFinalAction,
    setDeclineReason,
    setDeclineNote,
    submitDecline,
    endSession,
  }), [
    state, currentDocument, currentPage, myFields, currentPageFields,
    requiredMyFieldIds, allRequiredComplete, completionHeading, role,
    loadRequest, setStep, setAuthCode, submitAuth, acceptConsentAction,
    setDocument, setPage, setFieldValue, openSignatureDialog, closeSignatureDialog,
    setSignatureMethod, setSignatureTypedText, setSignatureStyle, setSignatureDrawn,
    adoptSignature, setApprovalDecision, setApprovalNotes, setReviewDecision,
    setReviewNotes, goToSummary, submitFinalAction, setDeclineReason, setDeclineNote,
    submitDecline, endSession,
  ]);

  return (
    <RecipientContext.Provider value={value}>
      {children}
    </RecipientContext.Provider>
  );
}

export function useRecipient(): RecipientContextValue {
  const ctx = useContext(RecipientContext);
  if (!ctx) throw new Error("useRecipient must be used inside RecipientProvider");
  return ctx;
}

// Re-export for use in pages
export { TYPED_SIGNATURE_STYLES };
