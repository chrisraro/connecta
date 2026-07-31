"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        const isTransitionSupported =
            typeof document !== "undefined" &&
            // @ts-ignore
            document.startViewTransition !== undefined &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!isTransitionSupported) {
            setTheme(theme === "dark" ? "light" : "dark");
            return;
        }

        const x = event.clientX;
        const y = event.clientY;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        // @ts-ignore
        const transition = document.startViewTransition(async () => {
            setTheme(theme === "dark" ? "light" : "dark");
        });

        transition.ready.then(() => {
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
            ];

            document.documentElement.animate(
                {
                    clipPath: theme === "dark" ? [...clipPath].reverse() : clipPath,
                },
                {
                    duration: 500,
                    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                    pseudoElement: theme === "dark"
                        ? "::view-transition-old(root)"
                        : "::view-transition-new(root)",
                }
            );
        });
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-11 h-11 border border-border bg-background/50 backdrop-blur-sm hover:bg-muted transition-snap hover:scale-105 active:scale-95"
            onClick={handleToggle}
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
