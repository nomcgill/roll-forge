import { render, screen } from "@testing-library/react";
import HeaderAccountLink from "./HeaderAccountLink";

// Mocks
jest.mock("next-auth/react", () => ({
    useSession: jest.fn(),
}));
jest.mock("next/navigation", () => ({
    usePathname: jest.fn(),
}));

const { useSession } = require("next-auth/react");
const { usePathname } = require("next/navigation");

function setAuth(
    status: "authenticated" | "unauthenticated" | "loading" = "authenticated"
) {
    (useSession as jest.Mock).mockReturnValue({ status });
}

function setPath(pathname: string) {
    (usePathname as jest.Mock).mockReturnValue(pathname);
}

describe("HeaderAccountLink", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders nothing when unauthenticated", () => {
        setAuth("unauthenticated");
        setPath("/characters");

        render(<HeaderAccountLink />);
        expect(screen.queryByRole("link", { name: /account/i })).toBeNull();
    });

    it("hides on root '/' when authenticated", () => {
        setAuth("authenticated");
        setPath("/");

        render(<HeaderAccountLink />);
        expect(screen.queryByRole("link", { name: /account/i })).toBeNull();
    });

    it("shows on non-root pages when authenticated", () => {
        setAuth("authenticated");
        setPath("/characters");

        render(<HeaderAccountLink />);
        const link = screen.getByRole("link", { name: /go to account settings/i });
        expect(link).toHaveAttribute("href", "/account");
        expect(link).toHaveTextContent(/account/i);
    });

    it("hides on '/account' when authenticated", () => {
        setAuth("authenticated");
        setPath("/account");

        render(<HeaderAccountLink />);
        expect(screen.queryByRole("link", { name: /account/i })).toBeNull();
    });

    it("hides on nested '/account/*' when authenticated", () => {
        setAuth("authenticated");
        setPath("/account/security");

        render(<HeaderAccountLink />);
        expect(screen.queryByRole("link", { name: /account/i })).toBeNull();
    });
});
