import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterDetails from "./CharacterDetails";

describe("CharacterDetails (a11y-friendly)", () => {
    it("renders the character name and avatar image when present", () => {
        render(
            <CharacterDetails
                character={{
                    id: "char_1",
                    name: "Mock Hero",
                    avatarUrl: "https://example.com/avatar.png",
                    preferences: null,
                }}
            />
        );

        // Heading by accessible role + name
        expect(screen.getByRole("heading", { name: "Mock Hero" })).toBeInTheDocument();

        // Avatar image by role + accessible name
        expect(screen.getByRole("img", { name: "Avatar of Mock Hero" })).toBeInTheDocument();

        // No fallback when avatar exists
        expect(screen.queryByTestId("avatar-fallback")).toBeNull();

        // Edit control present (mocked)
        expect(screen.getByRole("button", { name: /edit character/i })).toBeInTheDocument();
    });

    it("renders a unique, aria-hidden fallback when no avatar", () => {
        render(
            <CharacterDetails
                character={{
                    id: "char_2",
                    name: "No Avatar Hero",
                    avatarUrl: null,
                    preferences: { theme: "dark" },
                }}
            />
        );

        // Heading by role
        expect(screen.getByRole("heading", { name: "No Avatar Hero" })).toBeInTheDocument();

        // Fallback visible but not an accessible name
        const fallback = screen.getByTestId("avatar-fallback");
        expect(fallback).toHaveTextContent(/no avatar/i);

        // No <img> when avatar is missing
        expect(screen.queryByRole("img", { name: /avatar of/i })).toBeNull();

        // Edit control present (mocked)
        expect(screen.getByRole("button", { name: /edit character/i })).toBeInTheDocument();
    });
    it("opens and closes the settings modal", async () => {
        render(<CharacterDetails character={{ id: "c1", name: "Testy", avatarUrl: "", preferences: {} }} />);

        const user = userEvent.setup();
        const trigger = screen.getByRole("button", { name: /edit character/i });
        await user.click(trigger);

        // open
        await screen.findByRole("dialog", { name: /edit character preferences/i });

        // close via backdrop
        await user.click(screen.getByTestId("char-settings-backdrop"));

        // re-query after state change (don’t assert on a stale reference)
        await waitFor(() => {
            expect(
                screen.queryByRole("dialog", { name: /edit character preferences/i })
            ).not.toBeInTheDocument();
        });
    });
});
