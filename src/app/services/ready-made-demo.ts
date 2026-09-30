// The demo build's ready-made templates: four titles with PLACEHOLDER text,
// bundled on purpose because the demo has no server. The real library is never bundled
// (see ready-made-templates.ts); the real app gets it from the server.

import type { RawLibrary } from "./ready-made-templates";

export const DEMO_READY_MADE_LIBRARY: RawLibrary = {
 "categories": [
  {
   "category": "Recruitment & HR",
   "documents": [
    {
     "document_type": "Employment contracts and offer letters",
     "title": "Employment Offer Letter and Contract Agreement",
     "body_content": "This is a demonstration copy of the “Employment Offer Letter and Contract Agreement” template. The full wording is part of the live app's Personal and Business plans.",
     "signing_workflow": [
      {
       "step": 1,
       "role": "HR Manager",
       "action_type": "Preparer"
      },
      {
       "step": 2,
       "role": "Hiring Manager",
       "action_type": "Reviewer"
      },
      {
       "step": 3,
       "role": "Candidate",
       "action_type": "Signer"
      },
      {
       "step": 4,
       "role": "HR Director",
       "action_type": "Approver"
      },
      {
       "step": 5,
       "role": "HR Records",
       "action_type": "Archiver"
      }
     ]
    }
   ]
  },
  {
   "category": "Sales & Customer Agreements",
   "documents": [
    {
     "document_type": "Sales contracts and purchase orders",
     "title": "Sales Contract and Purchase Order Agreement",
     "body_content": "This is a demonstration copy of the “Sales Contract and Purchase Order Agreement” template. The full wording is part of the live app's Personal and Business plans.",
     "signing_workflow": [
      {
       "step": 1,
       "role": "Sales Representative",
       "action_type": "Preparer"
      },
      {
       "step": 2,
       "role": "Customer",
       "action_type": "Signer"
      },
      {
       "step": 3,
       "role": "Sales Manager",
       "action_type": "Reviewer"
      },
      {
       "step": 4,
       "role": "Finance Officer",
       "action_type": "Approver"
      },
      {
       "step": 5,
       "role": "Sales Administration",
       "action_type": "Archiver"
      }
     ]
    }
   ]
  },
  {
   "category": "Procurement & Supply Chain",
   "documents": [
    {
     "document_type": "Vendor contracts",
     "title": "Vendor Service Agreement",
     "body_content": "This is a demonstration copy of the “Vendor Service Agreement” template. The full wording is part of the live app's Personal and Business plans.",
     "signing_workflow": [
      {
       "step": 1,
       "role": "Procurement Officer",
       "action_type": "Preparer"
      },
      {
       "step": 2,
       "role": "Vendor Representative",
       "action_type": "Signer"
      },
      {
       "step": 3,
       "role": "Procurement Manager",
       "action_type": "Reviewer"
      },
      {
       "step": 4,
       "role": "Finance or Legal Officer",
       "action_type": "Approver"
      },
      {
       "step": 5,
       "role": "Procurement Department",
       "action_type": "Archiver"
      }
     ]
    }
   ]
  },
  {
   "category": "Finance & Legal",
   "documents": [
    {
     "document_type": "Investment contracts",
     "title": "Investment Agreement",
     "body_content": "This is a demonstration copy of the “Investment Agreement” template. The full wording is part of the live app's Personal and Business plans.",
     "signing_workflow": [
      {
       "step": 1,
       "role": "Investment Manager",
       "action_type": "Preparer"
      },
      {
       "step": 2,
       "role": "Investor",
       "action_type": "Signer"
      },
      {
       "step": 3,
       "role": "Legal Counsel",
       "action_type": "Reviewer"
      },
      {
       "step": 4,
       "role": "Chief Financial Officer",
       "action_type": "Approver"
      },
      {
       "step": 5,
       "role": "Finance Department",
       "action_type": "Archiver"
      }
     ]
    }
   ]
  }
 ]
};
