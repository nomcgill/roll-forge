import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditCharacterDropdown from "./EditCharacterDropdown";

// Mock router
const push = jest.fn();
const refresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push, refresh }),
}));

let fetchMock: jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
});

describe("EditCharacterDropdown", () => {
    const baseChar = {
        id: "char_123",
        name: "Aria",
        avatarUrl: "https://img",
        preferences: { theme: "dark" },
    };

    function open() {
        fireEvent.click(screen.getByRole("button", { name: /edit character/i }));
    }

    it("opens, edits, saves successfully (200) and refreshes", async () => {
        fetchMock.mockResolvedValueOnce({
            status: 200,
            json: async () => ({
                id: "char_123",
                name: "Aria Renamed",
                avatarUrl: null,
                preferences: { theme: "dark" },
                userId: "user_abc",
            }),
        });

        render(<EditCharacterDropdown character={baseChar} />);
        open();

        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Aria Renamed" } });
        fireEvent.change(screen.getByLabelText(/avatar url/i), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/characters/char_123", expect.anything()));
        await waitFor(() => expect(refresh).toHaveBeenCalled());
    });

    it("shows 422 validation message from server", async () => {
        fetchMock.mockResolvedValueOnce({
            status: 422,
            json: async () => ({
                issues: { fieldErrors: { name: ["Name is required"] }, formErrors: [] },
            }),
        });

        render(<EditCharacterDropdown character={baseChar} />);
        open();

        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Name is required"));
    });

    it("redirects to sign-in on 401", async () => {
        fetchMock.mockResolvedValueOnce({
            status: 401,
            json: async () => ({ error: "Unauthorized" }),
        });

        render(<EditCharacterDropdown character={baseChar} />);
        open();

        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() =>
            expect(push).toHaveBeenCalledWith(
                `/api/auth/signin?callbackUrl=${encodeURIComponent("/characters/char_123")}`
            )
        );
    });

    it("shows client-side error for invalid JSON in preferences", async () => {
        render(<EditCharacterDropdown character={baseChar} />);
        open();

        fireEvent.change(screen.getByLabelText(/preferences/i), { target: { value: "not-json" } });
        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() =>
            expect(screen.getByRole("alert")).toHaveTextContent("Preferences must be valid JSON")
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
