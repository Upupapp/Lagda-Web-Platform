# Launch Route Map

**Version:** C35  
**Date:** 2026-07-16

Full route inventory for the LAGDA frontend. All routes are defined in `src/router.tsx`.

---

## Public Routes

### Root
| Path | Component | Notes |
|---|---|---|
| `/` | HomePage | Marketing home |

### eSignature Product
| Path | Component |
|---|---|
| `/esignature` | ESignaturePage |
| `/esignature/how-it-works` | HowItWorksPage |
| `/esignature/for-business` | ForBusinessPage |
| `/esignature/for-individuals` | ForIndividualsPage |
| `/esignature/mobile` | MobileSigningPage |
| `/esignature/api` | ApiSigningPage |

### Features
| Path | Component |
|---|---|
| `/features` | FeaturesPage |
| `/features/electronic-signatures` | ElectronicSignaturesPage |
| `/features/document-management` | DocumentManagementPage |
| `/features/templates` | TemplatesFeaturePage |
| `/features/bulk-send` | BulkSendPage |
| `/features/advanced-fields` | AdvancedFieldsPage |
| `/features/audit-trail` | AuditTrailPage |
| `/features/identity-verification` | IdentityVerificationPage |
| `/features/team-management` | TeamManagementPage |
| `/features/integrations` | IntegrationsPage |
| `/features/mobile-signing` | MobileSigningFeaturePage |
| `/features/document-tracking` | DocumentTrackingPage |
| `/features/recipient-experience` | RecipientExperiencePage |
| `/features/workflow-automation` | WorkflowAutomationFeaturePage |
| `/features/reporting-analytics` | ReportingAnalyticsPage |
| `/features/security` | SecurityFeaturePage |

### Security
| Path | Component |
|---|---|
| `/security` | SecurityPage |
| `/security/encryption` | EncryptionPage |
| `/security/compliance` | CompliancePage |
| `/security/certifications` | CertificationsPage |
| `/security/data-protection` | DataProtectionPage |
| `/security/privacy` | PrivacySecurityPage |
| `/security/access-controls` | AccessControlsPage |
| `/security/infrastructure` | InfrastructurePage |
| `/security/incident-response` | IncidentResponsePage |
| `/security/penetration-testing` | PenetrationTestingPage |

### Solutions
| Path | Component |
|---|---|
| `/solutions` | SolutionsPage |
| `/solutions/legal` | LegalPage |
| `/solutions/real-estate` | RealEstatePage |
| `/solutions/hr-employment` | HrEmploymentPage |
| `/solutions/finance` | FinancePage |
| `/solutions/healthcare` | HealthcarePage |
| `/solutions/education` | EducationPage |
| `/solutions/government` | GovernmentPage |
| `/solutions/startups` | StartupsPage |
| `/solutions/enterprise` | EnterprisePage |
| `/solutions/sme` | SmePage |
| `/solutions/freelancers` | FreelancersPage |

### Pricing
| Path | Component |
|---|---|
| `/pricing` | PricingPage |
| `/pricing/starter` | StarterPricingPage |
| `/pricing/business` | BusinessPricingPage |
| `/pricing/enterprise` | EnterprisePricingPage |
| `/pricing/compare` | PricingComparePage |
| `/pricing/faq` | PricingFaqPage |
| `/pricing/calculator` | PricingCalculatorPage |
| `/pricing/nonprofits` | NonprofitsPricingPage |

### Resources
| Path | Component |
|---|---|
| `/resources` | ResourcesPage |
| `/resources/blog` | BlogPage |
| `/resources/case-studies` | CaseStudiesPage |
| `/resources/guides` | GuidesPage |
| `/resources/webinars` | WebinarsPage |
| `/resources/templates` | TemplateLibraryPage |
| `/resources/api-docs` | ApiDocsPage |
| `/resources/changelog` | ChangelogPage |

### Help / Contact
| Path | Component |
|---|---|
| `/help` | HelpPage |
| `/help/contact` | ContactPage |
| `/help/support` | SupportPage |

### Legal
| Path | Component |
|---|---|
| `/legal/terms` | TermsPage |
| `/legal/privacy` | PrivacyPage |
| `/legal/cookies` | CookiesPage |

### eNotary (Future Product)
| Path | Component | Notes |
|---|---|---|
| `/enotary` | ENotaryPage | "Coming Soon" |
| `/enotary/how-it-works` | ENotaryHowItWorksPage | |
| `/enotary/pricing` | ENotaryPricingPage | |
| `/enotary/legal-basis` | ENotaryLegalBasisPage | |
| `/enotary/faq` | ENotaryFaqPage | |

### Conversion
| Path | Component |
|---|---|
| `/verify` | VerifyDocumentPage (public) |
| `/book-demo` | BookDemoPage |
| `/create-account` | CreateAccountPage |

---

## Authenticated Routes (under `/app`)

Platform shell: `PlatformLayout` wraps all `/app/*` routes.

### Platform Root
| Path | Notes |
|---|---|
| `/app` | Redirect to `/app/dashboard` |

### Dashboard
| Path | Component |
|---|---|
| `/app/dashboard` | PlatformDashboard |

### Auth Flow
| Path | Component |
|---|---|
| `/app/login` | LoginPage |
| `/app/signup` | SignupPage |
| `/app/forgot-password` | ForgotPasswordPage |
| `/app/reset-password` | ResetPasswordPage |
| `/app/verify-email` | VerifyEmailPage |
| `/app/onboarding` | OnboardingPage |
| `/app/onboarding/workspace` | WorkspaceSetupPage |
| `/app/onboarding/profile` | ProfileSetupPage |
| `/app/onboarding/invite` | InviteTeamPage |
| `/app/onboarding/complete` | OnboardingCompletePage |

### Documents Workspace
| Path | Component |
|---|---|
| `/app/documents` | DocumentsPage |
| `/app/documents/inbox` | DocumentsInboxPage |
| `/app/documents/sent` | DocumentsSentPage |
| `/app/documents/completed` | DocumentsCompletedPage |

### Transaction Detail
| Path | Component |
|---|---|
| `/app/documents/:id` | TransactionDetailPage |
| `/app/documents/:id/overview` | TransactionOverviewTab |
| `/app/documents/:id/recipients` | TransactionRecipientsTab |
| `/app/documents/:id/audit-trail` | TransactionAuditTab |
| `/app/documents/:id/fields` | TransactionFieldsTab |
| `/app/documents/:id/history` | TransactionHistoryTab |

### Verification (Authenticated)
| Path | Component |
|---|---|
| `/app/verify` | VerifyPage |
| `/app/verify/result` | VerifyResultPage |

### Prepare Document
| Path | Component |
|---|---|
| `/app/prepare/:id` | PrepareDocumentPage |
| `/app/prepare/:id/upload` | PrepareUploadStep |
| `/app/prepare/:id/recipients` | PrepareRecipientsStep |
| `/app/prepare/:id/configure` | PrepareConfigureStep |
| `/app/prepare/:id/fields` | PrepareFieldsStep |
| `/app/prepare/:id/review` | PrepareReviewStep |
| `/app/prepare/:id/send` | PrepareSendStep |
| `/app/prepare/:id/confirmation` | PrepareConfirmationPage |

### Field Placement
| Path | Component |
|---|---|
| `/app/fields/:id` | FieldsPage |

### Recipient Signing
| Path | Component |
|---|---|
| `/app/sign/:token` | SigningPage |
| `/app/sign/:token/start` | SigningStartPage |
| `/app/sign/:token/review` | SigningReviewPage |
| `/app/sign/:token/sign` | SigningSignPage |
| `/app/sign/:token/date` | SigningDatePage |
| `/app/sign/:token/initials` | SigningInitialsPage |
| `/app/sign/:token/complete` | SigningCompletePage |
| `/app/sign/:token/declined` | SigningDeclinedPage |
| `/app/sign/:token/expired` | SigningExpiredPage |
| `/app/sign/:token/verify-identity` | SigningVerifyIdentityPage |

### Templates
| Path | Component |
|---|---|
| `/app/templates` | TemplatesPage |
| `/app/templates/new` | NewTemplatePage |
| `/app/templates/:id` | TemplateDetailPage |
| `/app/templates/:id/edit` | TemplateEditPage |
| `/app/templates/:id/use` | UseTemplatePage |
| `/app/templates/:id/preview` | TemplatePreviewPage |
| `/app/templates/library` | TemplateCatalogPage |

### Contacts
| Path | Component |
|---|---|
| `/app/contacts` | ContactsPage |
| `/app/contacts/new` | NewContactPage |
| `/app/contacts/:id` | ContactDetailPage |
| `/app/contacts/:id/edit` | ContactEditPage |
| `/app/contacts/groups` | ContactGroupsPage |
| `/app/contacts/groups/:id` | ContactGroupDetailPage |
| `/app/contacts/import` | ContactImportPage |

### Workspace Admin
| Path | Component |
|---|---|
| `/app/workspace` | WorkspacePage |
| `/app/workspace/members` | WorkspaceMembersPage |
| `/app/workspace/members/invite` | InviteMembersPage |
| `/app/workspace/roles` | WorkspaceRolesPage |
| `/app/workspace/teams` | WorkspaceTeamsPage |
| `/app/workspace/teams/:id` | TeamDetailPage |
| `/app/workspace/audit-log` | WorkspaceAuditLogPage |
| `/app/workspace/branding` | WorkspaceBrandingPage |
| `/app/workspace/usage` | WorkspaceUsagePage |
| `/app/workspace/billing` | WorkspaceBillingPage |
| `/app/workspace/danger` | WorkspaceDangerPage |

### Settings
| Path | Component |
|---|---|
| `/app/settings` | SettingsPage |
| `/app/settings/profile` | ProfileSettingsPage |
| `/app/settings/account` | AccountSettingsPage |
| `/app/settings/security` | SecuritySettingsPage |
| `/app/settings/notifications` | NotificationSettingsPage |
| `/app/settings/signatures` | SignatureSettingsPage |
| `/app/settings/billing` | BillingSettingsPage |
| `/app/settings/plan` | PlanSettingsPage |
| `/app/settings/integrations` | IntegrationsSettingsPage |
| `/app/settings/api` | ApiSettingsPage |
| `/app/settings/webhooks` | WebhooksSettingsPage |
| `/app/settings/appearance` | AppearanceSettingsPage |
| `/app/settings/language` | LanguageSettingsPage |
| `/app/settings/data` | DataSettingsPage |
| `/app/settings/danger` | DangerZonePage |

### Signature Library
| Path | Component |
|---|---|
| `/app/signatures` | SignatureLibraryPage |
| `/app/signatures/new` | NewSignaturePage |
| `/app/signatures/:id` | SignatureDetailPage |
| `/app/signatures/:id/edit` | SignatureEditPage |

### Recipient Inbox
| Path | Component |
|---|---|
| `/app/inbox` | RecipientInboxPage |
| `/app/inbox/:id` | InboxItemDetailPage |

### Notifications
| Path | Component |
|---|---|
| `/app/notifications` | NotificationsCenterPage |
| `/app/notifications/preferences` | NotificationPreferencesPage |

### Reports
| Path | Component |
|---|---|
| `/app/reports` | ReportsCenterPage |
| `/app/reports/signing-activity` | SigningActivityReport |
| `/app/reports/completion-rates` | CompletionRatesReport |
| `/app/reports/turnaround-time` | TurnaroundTimeReport |
| `/app/reports/recipient-performance` | RecipientPerformanceReport |
| `/app/reports/template-usage` | TemplateUsageReport |
| `/app/reports/team-performance` | TeamPerformanceReport |
| `/app/reports/compliance` | ComplianceReport |

### Global Search
| Path | Component |
|---|---|
| `/app/search` | GlobalSearchPage |

### Document Organization
| Path | Component |
|---|---|
| `/app/folders` | FoldersPage |
| `/app/tags` | TagsPage |
| `/app/views` | SavedViewsPage |
| `/app/favorites` | FavoritesPage |
| `/app/bulk` | BulkActionsPage |

### Workflow Automation (Enterprise Preview — CapabilityGuard gated)
| Path | Component | Guard |
|---|---|---|
| `/app/automation` | AutomationOverviewPage | CapabilityGuard: workflow-automation |
| `/app/automation/rules` | AutomationRulesPage | CapabilityGuard: workflow-automation |
| `/app/automation/rules/new` | AutomationRuleEditorPage | CapabilityGuard: workflow-automation |
| `/app/automation/rules/:id` | AutomationRuleDetailPage | CapabilityGuard: workflow-automation |
| `/app/automation/policies` | AutomationPoliciesPage | CapabilityGuard: workflow-automation |
| `/app/automation/policies/new` | AutomationPolicyEditorPage | CapabilityGuard: workflow-automation |
| `/app/automation/policies/:id` | AutomationPolicyDetailPage | CapabilityGuard: workflow-automation |
| `/app/automation/simulations` | AutomationSimulationsPage | CapabilityGuard: workflow-automation |
| `/app/automation/conflicts` | AutomationConflictsPage | CapabilityGuard: workflow-automation |
| `/app/automation/activity` | AutomationActivityPage | CapabilityGuard: workflow-automation |

---

## 404 Handler
| Path | Component |
|---|---|
| `*` | NotFoundPage |
