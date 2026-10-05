// The Help Center's articles: one task each, in numbered steps, written from
// how the screens work today. Nothing here describes a feature that is not
// built (no reminders, no SMS codes, no eNotary).
//
// Each article is plain data so the page that renders it and the test that
// checks its links stay simple. `related` paths must be routes the app has;
// the test in __tests__/help-articles.test.ts enforces that.

export type HelpCategory =
  | "Getting started" | "Sending documents" | "Signing" | "Documents and records"
  | "Templates" | "Contacts and sharing" | "Workspace" | "Account" | "Plans and billing";

export interface HelpArticle {
  readonly slug: string;
  readonly category: HelpCategory;
  readonly title: string;
  /** One sentence: what you will have done by the end. */
  readonly summary: string;
  /** Who the article is for, or what you need first. */
  readonly before?: readonly string[];
  readonly steps: readonly string[];
  /** Short points worth knowing, after the steps. */
  readonly notes?: readonly string[];
  /** Other articles (slugs) and pages (paths) worth reading next. */
  readonly related?: readonly { readonly label: string; readonly to: string }[];
  readonly tags: readonly string[];
}

export const HELP_CATEGORIES: readonly HelpCategory[] = [
  "Getting started", "Sending documents", "Signing", "Documents and records",
  "Templates", "Contacts and sharing", "Workspace", "Account", "Plans and billing",
];

export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    slug: "create-your-account",
    category: "Getting started",
    title: "Create your LAGDA account",
    summary: "Open a free account, verify your email and reach your Home page for the first time.",
    steps: [
      "Go to lagda.io and click Create Free Account at the top right.",
      "Enter your full name, your email address and a password, then confirm the password. Organisation and intended use are optional.",
      "Open the Terms of Service and Privacy Policy links, then tick the box to agree to them.",
      "Click Create account. LAGDA sends a verification link to your email address.",
      "Open the email and click the link. Your email must be verified before you can send documents, because signing links are delivered by email.",
      "Sign in. You land on Home, which shows what needs your attention, what is in flight and what was recently completed.",
    ],
    notes: [
      "Every new account starts on the Free plan: you can send one document for signing and sign as many documents as people send you.",
      "A short welcome tour opens the first time. You can restart it any time from the compass icon in the top bar.",
      "If the verification email does not arrive, check your spam folder, then sign in and click Resend email on the verify-your-email page.",
    ],
    related: [{ label: "Turn on two-step verification", to: "/help/two-step-verification" }, { label: "Plans, prices and limits", to: "/pricing" }],
    tags: ["sign up", "register", "verify email", "new account", "free"],
  },
  {
    slug: "prepare-and-send-a-document",
    category: "Sending documents",
    title: "Prepare and send a document for signing",
    summary: "Upload a file, name the people who sign, place the fields and send it. This is the main thing LAGDA does.",
    before: ["A verified LAGDA account.", "The document as a PDF, DOC or DOCX file.", "The name and email address of each person who will sign, approve or receive a copy."],
    steps: [
      "Click Prepare Document, the dark button at the top of the sidebar.",
      "Documents: drop your file onto the page or click to select it. You can add more than one file to the same request. Give the transaction a title if you want something other than the file name, then click Continue.",
      "Signers: add each participant with their full name, email address and role. Roles are Signer, Approver, Reviewer, Acknowledges, Viewer and Copy recipient. You can pick people from your Contacts instead of typing them.",
      "Order: choose whether everyone signs at the same time (parallel) or one after another (sequential). For sequential signing, arrange the participants into steps; a person is only emailed when their step is reached.",
      "Settings: optionally switch on Expiration and pick a date. Signing closes at the end of that day, Philippine time, and you are told in LAGDA when it does. Choose whether participants receive the completed document.",
      "Place Fields: click a participant, then click on the page where their signature, initials, date or text should go. Every signer needs at least one signature field. The checklist on the right turns green when the document is ready.",
      "Authentication: confirm how signers prove who they are. Every signer receives a private link at their email address; a signer with a LAGDA account can also sign from inside the app.",
      "Review: read the summary of files, participants, order and settings. Use Edit on any part to go back.",
      "Authorization: tick the confirmation that you are authorised to send this document, then click Send. Each participant whose turn it is receives an email with their signing link straight away.",
    ],
    notes: [
      "Sending is final: the request now exists in front of its recipients. To change who signs, use Send again on the document, which creates a new request.",
      "Nothing is sent until you press Send at the Authorization step. You can leave at any earlier step and the draft is kept under Documents › Records › Draft.",
      "Some documents cannot be signed electronically, for example deeds of sale and anything that must be notarised. The Legal Framework page explains which.",
    ],
    related: [{ label: "Track a document you sent", to: "/help/track-a-sent-document" }, { label: "Which documents suit electronic signing", to: "/resources/legal-framework" }, { label: "How participant roles work", to: "/help/participant-roles" }],
    tags: ["send", "prepare", "upload", "fields", "signer", "sequential", "parallel", "expiration"],
  },
  {
    slug: "participant-roles",
    category: "Sending documents",
    title: "How participant roles work",
    summary: "What each role can do on a document, so you choose the right one for each person.",
    steps: [
      "Signer: must sign. The document cannot complete without every required signer.",
      "Approver: approves the document instead of signing it. They can also Skip (the document moves on without their approval) or Decline (the request ends for everyone). Put an approver in an earlier step than the signers so nothing is signed until they approve.",
      "Reviewer: reads the document and marks their review complete. They place no signature.",
      "Acknowledgment recipient: confirms they have read the document by clicking Acknowledge. Used for policies and notices. A required acknowledgment recipient must act before the document completes.",
      "Viewer: can open the document but is not asked to do anything.",
      "Copy recipient: is not asked to do anything and is not sent a link or an email. If they have a LAGDA account, the document appears there under Documents.",
      "On the Signers step, tick Required to make a person's part necessary for completion, or untick it for someone whose action is optional.",
    ],
    notes: [
      "Only signers, approvers, reviewers and acknowledgers are sent a signing link. Viewers and copy recipients are not.",
      "The Participants panel on a sent document shows each person's role and whether they have acted.",
    ],
    related: [{ label: "Prepare and send a document", to: "/help/prepare-and-send-a-document" }, { label: "Participant roles in detail", to: "/features/participant-roles" }],
    tags: ["roles", "signer", "approver", "reviewer", "viewer", "copy", "acknowledge"],
  },
  {
    slug: "track-a-sent-document",
    category: "Sending documents",
    title: "Track a document you sent",
    summary: "See who has signed, who is still to act, and what to do when a link has lapsed or a date has passed.",
    steps: [
      "Open Documents in the sidebar. Correspondence › Sent lists every document that is out for signature, as a card under your workspace's banner.",
      "The card shows how many participants have signed, the date it was sent, its expiration if you set one, and the status: Out for signature, Partially signed or Finalizing.",
      "Click Participants to see each person: their role, whether they have signed, approved, declined or are still awaiting, and the exact time of each action.",
      "Click History to read the audit trail: every event on the document, in order, with who did it and when.",
      "If a participant's signing link has ended (links last 14 days), the Participants panel says so and offers Send a new link. Nothing is sent again unless you press it; the person gets a fresh email and the old link stops working.",
      "Set expiration, or Change, on the card lets you add, move or remove the date on which signing closes.",
      "Send to new email starts a new request for the same document addressed to a different email, for when someone's address was wrong.",
    ],
    notes: [
      "Home › Needs attention lists documents that were declined, have expired, are expiring soon, or have had no signature for several days. View all opens the Declined & Expired list.",
      "When a document expires or is declined it moves from Sent to Records › Declined & Expired. Use Send again there to start a new request.",
      "The bell in the top bar tells you when a document is signed, completed, declined or expired, and when a signing link has lapsed.",
    ],
    related: [{ label: "Prepare and send a document", to: "/help/prepare-and-send-a-document" }, { label: "Find a completed document and its records", to: "/help/completed-documents-and-records" }],
    tags: ["status", "participants", "history", "audit trail", "expired", "declined", "new link", "track"],
  },
  {
    slug: "sign-a-document-sent-to-you",
    category: "Signing",
    title: "Sign a document someone sent you",
    summary: "Open your signing link, agree to sign electronically, fill in your fields and submit. No account is needed.",
    before: ["The email from LAGDA with your signing link. It is addressed to you alone; do not forward it."],
    steps: [
      "Open the email and click the signing button or link. The document opens in your browser.",
      "Confirm that you agree to sign and be identified electronically for this document, then click I consent — continue. If you have a LAGDA account you are first asked to confirm your password.",
      "Go through the fields marked for you. Click a signature field to adopt your signature: Draw it with your mouse or finger, Type your name, or Upload an image. Click Done, then Adopt Signature. Initials work the same way.",
      "Fill in any date, text or checkbox fields assigned to you. A field marked Required must be completed before you can finish.",
      "When every field is done, click Submit signature at the bottom of the page. LAGDA seals your signature and records the time. To refuse instead, click Decline and choose a reason.",
      "You will see a confirmation. The sender is told at once. When everyone has signed, the completed document is available to all participants.",
    ],
    notes: [
      "If you would rather not sign, click Decline this request and say why. The sender sees your reason and the request closes for everyone.",
      "A signing link works for 14 days. If it has expired, ask the sender to send you a new link; they can do it from the document's Participants panel.",
      "If you have a LAGDA account with the same email address, the document also appears under Documents › I must sign, where you can continue signing after confirming your password.",
      "The sender may have set an expiration date. The card and the email show it; after that day you can no longer sign.",
    ],
    related: [{ label: "Documents you signed, and your copy", to: "/help/documents-you-signed" }, { label: "Signer authentication options", to: "/features/signer-authentication" }],
    tags: ["sign", "signature", "draw", "type", "upload", "consent", "decline", "link"],
  },
  {
    slug: "documents-you-signed",
    category: "Signing",
    title: "Documents you signed, and your copy",
    summary: "Find every document you took part in, open the completed version and check its record.",
    before: ["A LAGDA account with the email address the document was sent to."],
    steps: [
      "Open Documents in the sidebar and click Records.",
      "Signed by me lists documents you signed. Others lists documents where you had another role, such as approver or viewer, once they are complete.",
      "Each card shows the sender's workspace, the Verification ID and how many participants signed. Click the card menu to View the completed document, open Participants, or read the History.",
      "View opens the signed version. Download it from the viewer if you want your own copy.",
    ],
    notes: [
      "A completed document's Verification ID lets anyone confirm it later at lagda.io/verify without seeing its contents.",
      "If you signed without an account and later create one with the same email address, your signed documents appear here.",
    ],
    related: [{ label: "Check a document by its Verification ID", to: "/help/check-a-document" }, { label: "Sign a document someone sent you", to: "/help/sign-a-document-sent-to-you" }],
    tags: ["signed by me", "copy", "download", "completed", "records"],
  },
  {
    slug: "completed-documents-and-records",
    category: "Documents and records",
    title: "Find a completed document and its records",
    summary: "Open the sealed document, its participants and its audit trail after everyone has signed.",
    steps: [
      "Open Documents › Records › Completed. Every document you sent that has been signed by everyone is listed as a card with its Verification ID.",
      "Click View to open the completed, sealed document. The viewer opens the signed version; the original upload is one click away.",
      "Click Participants to see each person, the name and email you gave, the LAGDA account they signed with if any, and the time of their signature. A notice appears if the name you typed differs from the account's name.",
      "Click History for the audit trail: created, sent, opened, consented, signed, completed, each with its time.",
      "Copy the Verification ID from the card to give to someone who needs to confirm the document is genuine.",
    ],
    notes: [
      "On a paid plan, Share lets you give another LAGDA user access to a completed document. See Share a completed document.",
      "Drafts you never sent are under Records › Draft; declined and expired requests are under Declined & Expired.",
    ],
    related: [{ label: "Check a document by its Verification ID", to: "/help/check-a-document" }, { label: "Share a completed document", to: "/help/share-a-completed-document" }, { label: "Document Verification Guide", to: "/resources/document-verification-guide" }],
    tags: ["completed", "audit trail", "verification id", "history", "sealed", "download"],
  },
  {
    slug: "check-a-document",
    category: "Documents and records",
    title: "Check a document by its Verification ID or file",
    summary: "Confirm that a document was completed through LAGDA and that a file you hold is the sealed original.",
    steps: [
      "Open lagda.io/verify (Check a Document in the app sidebar, or Document Verification in the website footer).",
      "Type the Verification ID printed on the document, in the form LAGDA-VER-YYYY-XXXXXXXXXX, and click Check record. Or scan the QR code on the document with your phone.",
      "The result shows whether a completed record exists, when it was completed, how many participants it had, and the cryptographic digest of the sealed file. It does not show the document or the participants' details.",
      "To compare a PDF you hold against the sealed original, drop it under Check a file and click Check file. LAGDA compares the file's digest; nothing is uploaded or stored.",
      "If you took part in the document or it was shared with you, enter your email address under View the signed document. LAGDA emails you a 6-digit code that lets you open the signed copy, the participants and the audit trail.",
    ],
    notes: [
      "A result of not found means no completed record has that ID. Check it was typed exactly as printed.",
      "The code expires after ten minutes. You can ask for another.",
      "Verification confirms what LAGDA sealed. It is not a statement about the document's legal validity.",
    ],
    related: [{ label: "Document Verification Guide", to: "/resources/document-verification-guide" }, { label: "Find a completed document and its records", to: "/help/completed-documents-and-records" }],
    tags: ["verify", "verification id", "qr", "check file", "digest", "authentic"],
  },
  {
    slug: "create-a-template",
    category: "Templates",
    title: "Create a template and use it to send",
    summary: "Save a document with its roles and fields so you can send it again without setting it up each time.",
    before: ["Templates are included from the Personal plan. The Free plan can use the three blank starting points."],
    steps: [
      "Open Templates in the sidebar and click New Template.",
      "Choose Start from Blank to build one from your own file, or Browse templates to start from one of LAGDA's ready-made templates and edit it.",
      "Upload the document, add role placeholders (for example Client and Authorizing Officer) instead of named people, set the signing order, and place the fields for each role.",
      "Give the template a name and save it. It appears in your Templates list with its roles, documents and field count.",
      "To send from it, open the template and click Use Template. Prepare Document opens with everything filled in; you only type the real names and email addresses for each role, then review and send.",
    ],
    notes: [
      "Duplicate makes a copy you can change without touching the original. Delete removes a template; documents already sent from it are not affected.",
      "On the Business plan, templates in the workspace can be used by every member who can send.",
    ],
    related: [{ label: "Templates Guide", to: "/resources/templates-guide" }, { label: "Prepare and send a document", to: "/help/prepare-and-send-a-document" }],
    tags: ["template", "reuse", "roles", "placeholder", "new template", "use template"],
  },
  {
    slug: "add-contacts-and-find-people",
    category: "Contacts and sharing",
    title: "Add contacts and find people on LAGDA",
    summary: "Keep the people you send documents to in one place, and connect with other LAGDA users.",
    steps: [
      "Open Contacts in the sidebar. All contacts lists everyone you have saved; each card shows their email, organisation and whether they are on LAGDA.",
      "To add someone who is not on LAGDA, add them as a contact with their name, email and organisation. They can then be picked on the Signers step when you prepare a document.",
      "To connect with someone who has a LAGDA account, click Find people and type their exact email address. If they allow being found, you can send a contact request; it appears under their Pending tab and in their bell.",
      "When they accept, you are in each other's contacts and either of you can send the other a document request.",
      "Open a contact's profile with View profile to see their details, request a document from them, or archive them. Archived contacts stay available under the Archived tab.",
    ],
    notes: [
      "Whether others can find you by email is your choice: My Settings › Data & Privacy › Let people find me by email.",
      "Document requests (asking a contact to send you a signed document or an upload) are under the Document requests tab; the due date you set is a target, and the request stays open after it.",
    ],
    related: [{ label: "Share a completed document", to: "/help/share-a-completed-document" }, { label: "Prepare and send a document", to: "/help/prepare-and-send-a-document" }],
    tags: ["contacts", "find people", "contact request", "pending", "document request", "archive"],
  },
  {
    slug: "share-a-completed-document",
    category: "Contacts and sharing",
    title: "Share a completed document with another LAGDA user",
    summary: "Give someone outside the signing read access to a sealed document, and manage who has it.",
    before: ["A completed document you sent, on a Personal or Business plan."],
    steps: [
      "Open Documents › Records › Completed and open the card menu of the document.",
      "Click Share and enter the LAGDA email address of the person. They receive a notice in the app and by email.",
      "They accept or reject the share from Shared Documents › Shared with me. Once accepted, they can open the signed document, its participants and its audit trail, but cannot change anything.",
      "Shared Documents › Shared by me lists everything you have shared. Open People with access to see who has it and to remove someone's access.",
    ],
    notes: [
      "A person who was not a participant can also ask you for access from the public verification page; you approve or reject the request from your bell.",
      "Sharing never emails the document itself. The recipient reads it inside LAGDA, and the share can be withdrawn at any time.",
    ],
    related: [{ label: "Find a completed document and its records", to: "/help/completed-documents-and-records" }, { label: "Check a document by its Verification ID", to: "/help/check-a-document" }],
    tags: ["share", "shared documents", "access", "people with access", "shared with me"],
  },
  {
    slug: "invite-members-and-roles",
    category: "Workspace",
    title: "Invite members to your workspace and set their roles",
    summary: "Bring your team into one workspace, choose what each member may do, and use join links for larger groups.",
    before: ["A workspace on the Business plan. You must be its owner or an administrator."],
    steps: [
      "Open Workspace in the sidebar, then People & Teams.",
      "Click Invite people › Invite by email. Enter the person's email address and choose their role, then send. They receive an email and a notice in their LAGDA account.",
      "When they accept, they join at once in the role you chose. Invitations expire after seven days; an expired one can be resent from Invitations.",
      "For a group, click Join links › Create join link and share the link. Anyone who opens it asks to join; you decide each request under Join requests, and give them a role when you approve.",
      "To change a member's role or add a privilege (requesting documents, assigning signers), open the member and edit. Members can also be grouped into Teams.",
    ],
    notes: [
      "The roles are Owner, Administrator, Template Administrator, Sender, Reviewer, Auditor and New Comer. Workspace Settings › Roles & permissions shows exactly what each can do. Each member has one role.",
      "Invitations you have received from other workspaces are under Invitations in the sidebar.",
      "The workspace Activity log records every change to members, links, teams and settings, with who made it.",
    ],
    related: [{ label: "Team workspaces explained", to: "/features/team-workspaces" }, { label: "Plans, prices and limits", to: "/pricing" }],
    tags: ["invite", "members", "roles", "join link", "join request", "team", "administrator"],
  },
  {
    slug: "two-step-verification",
    category: "Account",
    title: "Turn on two-step verification",
    summary: "Protect your account with a code from an authenticator app, and keep recovery codes for when you lose your phone.",
    before: ["An authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or Authy."],
    steps: [
      "Open My Settings in the sidebar, then Security › Two-step verification.",
      "Under Authenticator app, start the set-up. LAGDA shows a QR code; scan it with your authenticator app, which starts producing 6-digit codes.",
      "Type the current code from the app to confirm. Two-step verification is now on.",
      "LAGDA shows your recovery codes once. Save them somewhere safe (a password manager or a printed copy), then confirm you have saved them. Each code can be used once to sign in without your phone.",
      "From now on, after your password you are asked for the current code from your app. If you have lost your phone, choose Use a recovery code instead.",
    ],
    notes: [
      "A sign-in attempt that is waiting for its code expires after ten minutes; start again from Sign in if that happens.",
      "Security › Sessions lists every browser signed in to your account. Sign out other sessions removes all of them except the one you are using.",
      "To change your password, use Security › Password. To reset a forgotten one, use Forgot password? on the sign-in page; a reset link is emailed to you.",
    ],
    related: [{ label: "Account security", to: "/security/account-security" }, { label: "Create your LAGDA account", to: "/help/create-your-account" }],
    tags: ["mfa", "two-step", "authenticator", "recovery codes", "password", "sessions", "security"],
  },
  {
    slug: "profile-notifications-and-signatures",
    category: "Account",
    title: "Your profile, notifications and saved signatures",
    summary: "Set how you appear to others, which emails LAGDA sends you, and the signature you apply to documents.",
    steps: [
      "Open My Settings in the sidebar. Sections run across the top: Profile, Preferences, Security, Notifications, Signatures & Initials, Data & Privacy and Plan & Billing.",
      "Profile: your name, display name, photo, job title and department. The display name is what senders and participants see.",
      "Preferences: your time zone and date and number formats, used wherever LAGDA shows a time.",
      "Notifications: which emails LAGDA sends you. Security emails cannot be turned off; the rest can. In-app notices always appear in the bell.",
      "Signatures & Initials: draw, type or upload the signature and initials you want ready when you sign. You can still choose a different one on each document.",
      "Data & Privacy: what LAGDA keeps about you, whether people can find you by email, and the buttons to ask for a copy of your data or to close your account.",
    ],
    notes: [
      "The bell in the top bar collects everything that happened: documents waiting for you, completions, invitations, contact requests and plan decisions. View all notifications opens the full list, where you can mark items read or dismiss them.",
    ],
    related: [{ label: "Turn on two-step verification", to: "/help/two-step-verification" }, { label: "Privacy Policy", to: "/legal/privacy" }],
    tags: ["profile", "photo", "notifications", "signature", "initials", "preferences", "privacy", "delete account"],
  },
  {
    slug: "choose-a-plan-and-invoices",
    category: "Plans and billing",
    title: "Choose a plan and find your invoices",
    summary: "Move from Free to Personal or Business, see what each includes, and download the invoice for each change.",
    steps: [
      "Open My Settings › Plan & Billing. Your current plan and what it includes are at the top; Compare all features opens the full table.",
      "Click Choose Personal or Choose Business. LAGDA is in test mode: no card is asked for and no money is moved. The request is approved and your plan changes.",
      "Once you are on a paid plan, the plan cards are replaced by your invoices. Open an invoice to view it, print it, or download it as a PDF.",
      "A workspace uses its owner's plan. If you own a workspace, moving to Business is what unlocks members, roles, teams and join links for it.",
      "To go back to Free, choose it on the same page; paid features stop but your documents and records stay.",
    ],
    notes: [
      "The Free plan allows one document sent for signing and unlimited signing of documents sent to you. Personal and Business add a monthly allowance, branding, sharing, templates and the chatbot; Business adds people and teams.",
      "The LAGDA owner can review every upgrade request under Review upgrade requests.",
      "Prices shown are test-mode prices. When payments go live you will be told in advance, and the Terms of Service describe the billing rules that will apply.",
    ],
    related: [{ label: "Pricing", to: "/pricing" }, { label: "Compare plans", to: "/pricing/compare" }, { label: "Terms of Service", to: "/legal/terms" }],
    tags: ["plan", "upgrade", "personal", "business", "invoice", "billing", "test mode", "free"],
  },
];

export function findHelpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find(article => article.slug === slug);
}

export function helpArticlePath(slug: string): string {
  return `/help/${slug}`;
}
