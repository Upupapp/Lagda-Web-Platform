// The wording-for-review page: shows the draft text from the one config file, says plainly that it is a
// draft that is not recorded anywhere yet, and lists what the reviewer is asked to settle.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { WordingDraftPage } from "../WordingDraftPage";
import {
  CERTIFICATE_LOCATION_SENTENCE, CERTIFICATE_LOCATION_UNCONFIRMED, LOCATION_CONSENT_TEXT, WORDING_REVIEW_QUESTIONS,
} from "../../../../config/enotary-wording";

const show = () => render(<MemoryRouter><WordingDraftPage /></MemoryRouter>);

describe("the wording for review", () => {
  it("says it is a draft that records and prints nothing yet", () => {
    show();
    const status = screen.getByTestId("wording-status");
    expect(status).toHaveTextContent("Draft for legal review");
    expect(status).toHaveTextContent(/None of this wording is recorded, shown to clients or printed on a certificate yet/);
    expect(status).toHaveTextContent(/can be changed at any time/);
  });

  it("shows the certificate sentence, its unconfirmed version and the consent text exactly as configured", () => {
    show();
    expect(screen.getByTestId("wording-sentence")).toHaveTextContent(CERTIFICATE_LOCATION_SENTENCE);
    expect(screen.getByTestId("wording-unconfirmed")).toHaveTextContent(CERTIFICATE_LOCATION_UNCONFIRMED);
    expect(screen.getByTestId("wording-consent-text")).toHaveTextContent(LOCATION_CONSENT_TEXT);
  });

  it("claims no more than the system knows: approximate, from the network address, a VPN can change it", () => {
    show();
    expect(screen.getByTestId("wording-sentence")).toHaveTextContent(/approximate location and is supporting evidence only/);
    expect(screen.getByTestId("wording-certificate")).toHaveTextContent(/VPN can change it/);
  });

  it("offers an example tick box that does nothing, and lists what the reviewer is asked to settle", () => {
    show();
    expect(screen.getByRole("checkbox", { name: "Example only: not active" })).toBeDisabled();
    const list = screen.getByTestId("wording-questions");
    for (const item of WORDING_REVIEW_QUESTIONS) expect(list).toHaveTextContent(item.question);
    expect(WORDING_REVIEW_QUESTIONS.length).toBe(5);
  });
});
