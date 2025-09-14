/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { useLongPress } from "@/components/roll/useLongPress";

describe("useLongPress", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    function TestButton({
        onLongPress,
        delay,
    }: {
        onLongPress: () => void;
        delay?: number;
    }) {
        const handlers = useLongPress({ onLongPress, delay });
        return (
            <button data-testid="btn" {...handlers}>
                Hold me
            </button>
        );
    }

    it("calls onLongPress after the delay on pointer hold", () => {
        const onLongPress = jest.fn();
        const { getByTestId } = render(<TestButton onLongPress={onLongPress} delay={200} />);

        const btn = getByTestId("btn");
        fireEvent.pointerDown(btn);

        jest.advanceTimersByTime(199);
        expect(onLongPress).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(onLongPress).toHaveBeenCalledTimes(1);

        fireEvent.pointerUp(btn);
        jest.runOnlyPendingTimers();
        expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it("does NOT call onLongPress if released before delay", () => {
        const onLongPress = jest.fn();
        const { getByTestId } = render(<TestButton onLongPress={onLongPress} delay={300} />);

        const btn = getByTestId("btn");
        fireEvent.pointerDown(btn);
        jest.advanceTimersByTime(299);
        fireEvent.pointerUp(btn);

        jest.runOnlyPendingTimers();
        expect(onLongPress).not.toHaveBeenCalled();
    });

    it("cancels when pointer leaves before delay", () => {
        const onLongPress = jest.fn();
        const { getByTestId } = render(<TestButton onLongPress={onLongPress} delay={250} />);

        const btn = getByTestId("btn");
        fireEvent.pointerDown(btn);
        jest.advanceTimersByTime(100);
        fireEvent.pointerLeave(btn);

        jest.runOnlyPendingTimers();
        expect(onLongPress).not.toHaveBeenCalled();
    });

    it("cancels when pointer is canceled before delay", () => {
        const onLongPress = jest.fn();
        const { getByTestId } = render(<TestButton onLongPress={onLongPress} delay={250} />);

        const btn = getByTestId("btn");
        fireEvent.pointerDown(btn);
        jest.advanceTimersByTime(100);
        fireEvent.pointerCancel(btn);

        jest.runOnlyPendingTimers();
        expect(onLongPress).not.toHaveBeenCalled();
    });

    it("supports multiple long presses across separate holds", () => {
        const onLongPress = jest.fn();
        const { getByTestId } = render(<TestButton onLongPress={onLongPress} delay={150} />);

        const btn = getByTestId("btn");

        fireEvent.pointerDown(btn);
        jest.advanceTimersByTime(151);
        expect(onLongPress).toHaveBeenCalledTimes(1);
        fireEvent.pointerUp(btn);

        fireEvent.pointerDown(btn);
        jest.advanceTimersByTime(151);
        expect(onLongPress).toHaveBeenCalledTimes(2);
        fireEvent.pointerUp(btn);
    });
});
