import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CharacterForm from "@/components/CharacterForm";

// Mock router.push
const push = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

let fetchMock: jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    // Attach a mock fetch so tests can call it
    (global as any).fetch = fetchMock;
});

afterAll(() => {
    // Clean up if you want to be strict
    // delete (global as any).fetch;
});

describe("CharacterForm", () => {
    it("renders name + avatar inputs and submit button", () => {
        render(<CharacterForm />);
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/avatar url \(optional\)/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    });

    it("submits and redirects to Location on 201", async () => {
        fetchMock.mockResolvedValueOnce({
            status: 201,
            // Keep it simple; no need for Headers()
            headers: { get: (k: string) => (k.toLowerCase() === "location" ? "/characters/char_ok" : null) },
            json: async () => ({ id: "char_ok" }),
        });

        render(<CharacterForm />);
        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Hero" } });
        fireEvent.change(screen.getByLabelText(/avatar url/i), { target: { value: "https://avatar.url/image.png" } });
        fireEvent.click(screen.getByRole("button", { name: /create/i }));

        await waitFor(() => expect(push).toHaveBeenCalledWith("/characters/char_ok"));
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/characters",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Test Hero", avatarUrl: "https://avatar.url/image.png" }),
            })
        );
    });

    it("shows server validation error on 422", async () => {
        fetchMock.mockResolvedValueOnce({
            status: 422,
            headers: { get: () => null },
            json: async () => ({
                issues: { fieldErrors: { name: ["Name is required"] }, formErrors: [] },
            }),
        });

        render(<CharacterForm />);
        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "X" } });
        fireEvent.click(screen.getByRole("button", { name: /create/i }));

        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Name is required"));
    });
});
