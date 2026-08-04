/**
 * @vitest-environment jsdom
 */
import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetProtectedPatientRouteRedirectForTests,
  useProtectedPatientRoute
} from "./useProtectedPatientRoute";

const replace = vi.fn();
let pathname = "/my-profile";
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams
}));

const ProtectedProbe = ({
  authStatus,
  token = ""
}: {
  authStatus: "initializing" | "authenticated" | "unauthenticated";
  token?: string;
}) => {
  useProtectedPatientRoute({ authStatus, token });
  return <div>probe</div>;
};

describe("useProtectedPatientRoute", () => {
  beforeEach(() => {
    pathname = "/my-profile";
    searchParams = new URLSearchParams();
    replace.mockClear();
    resetProtectedPatientRouteRedirectForTests();
  });

  afterEach(() => {
    resetProtectedPatientRouteRedirectForTests();
  });

  it("waits while bootstrap is initializing", () => {
    render(<ProtectedProbe authStatus="initializing" />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated protected routes once with returnTo", () => {
    searchParams = new URLSearchParams("tab=details");

    render(
      <StrictMode>
        <ProtectedProbe authStatus="unauthenticated" />
      </StrictMode>
    );

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/login?returnTo=%2Fmy-profile%3Ftab%3Ddetails");
  });

  it("does not redirect authenticated protected routes", () => {
    render(<ProtectedProbe authStatus="authenticated" token="valid-token" />);

    expect(replace).not.toHaveBeenCalled();
  });
});
